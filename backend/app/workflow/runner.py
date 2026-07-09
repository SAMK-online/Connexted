from datetime import UTC, datetime

from app.providers.ocr import extract_contact
from app.providers.research import enrich_company, enrich_contact
from app.schemas import (
    AgentRunRead,
    AgentStep,
    ConfidenceLabel,
    DraftChannel,
    DraftRegenerateRequest,
    DraftType,
    OutreachDraftRead,
    PitchStrategy,
    ReportRead,
    Signal,
)
from app.store import AppStore


async def run_capture_workflow(store: AppStore, capture_id: str) -> None:
    capture = await store.get_capture(capture_id)
    if not capture:
        return

    await store.mark_capture_running(capture_id)
    run = AgentRunRead(capture_id=capture_id)
    run = await store.save_agent_run(run)

    try:
        playbooks = await store.list_playbooks()
        playbook = playbooks[0] if playbooks else None
        contact = await _run_step(run, "ocr_contact_extraction", extract_contact(capture))
        company, sources = await _run_step(run, "company_enrichment", enrich_company(capture))
        contact, company_update, contact_sources = await _run_step(
            run,
            "contact_enrichment",
            enrich_contact(capture, contact, company),
        )
        if company_update:
            company = _merge_company(company, company_update)
        sources.extend(contact_sources)
        signals = _detect_signals(capture, sources)
        run.steps.append(
            _complete_step(
                "signal_detection",
                "Detected GTM signals from conversation notes and enrichment sources.",
                "Signals stay conservative and preserve source references for review.",
            )
        )
        if playbook:
            run.steps.append(
                _complete_step(
                    "playbook_context",
                    (
                        "Loaded ICP, personas, priority signals, source policy, value props, and "
                        f"{len(playbook.research_resources)} configured research resource(s)."
                    ),
                    _playbook_rationale(playbook),
                )
            )
        strategy = _build_strategy(capture, company, signals, playbook)
        run.steps.append(
            _complete_step(
                "pitch_strategy",
                "Generated recommended angle, value prop, CTA, and objections.",
                "Strategy uses submitted notes, saved playbook context, and signal confidence.",
            )
        )
        report = ReportRead(
            capture_id=capture_id,
            contact=contact,
            company=company,
            sources=sources,
            signals=signals,
            strategy=strategy,
            warnings=_warnings(contact.name, company.name, sources),
            confidence=ConfidenceLabel.MEDIUM if contact.name else ConfidenceLabel.LOW,
        )
        report.drafts = _build_drafts(report)
        run.steps.append(
            _complete_step(
                "draft_generation",
                "Generated initial email, LinkedIn connection, LinkedIn follow-up, and next-step email.",
                "Drafts avoid automatic sending and remain pending review.",
            )
        )
        run.status = "review_ready"
        run.updated_at = datetime.now(UTC)
        await store.save_agent_run(run)
        await store.save_report(report)
        await store.mark_capture_review_ready(capture_id, report.warnings)
    except Exception as exc:
        run.status = "failed"
        run.steps.append(
            AgentStep(
                name="workflow_error",
                status="failed",
                error=str(exc),
                finished_at=datetime.now(UTC),
            )
        )
        await store.save_agent_run(run)
        await store.mark_capture_failed(capture_id, [str(exc)])


async def regenerate_draft(
    store: AppStore, draft_id: str, payload: DraftRegenerateRequest
) -> OutreachDraftRead | None:
    return await store.regenerate_draft(draft_id, payload)


async def _run_step(run: AgentRunRead, name: str, awaitable):
    run.steps.append(
        AgentStep(
            name=name,
            status="running",
            input_summary="Running workflow node.",
        )
    )
    result = await awaitable
    run.steps[-1] = run.steps[-1].model_copy(
        update={
            "status": "completed",
            "output_summary": "Completed successfully.",
            "rationale": "Node output passed schema validation.",
            "finished_at": datetime.now(UTC),
        }
    )
    return result


def _complete_step(name: str, output_summary: str, rationale: str) -> AgentStep:
    return AgentStep(
        name=name,
        status="completed",
        output_summary=output_summary,
        rationale=rationale,
        finished_at=datetime.now(UTC),
    )


def _detect_signals(capture, sources) -> list[Signal]:
    source_ids = [source.id for source in sources]
    source_text = " ".join(source.snippet for source in sources if source.snippet)
    text = f"{capture.raw_text} {capture.notes or ''} {source_text}".lower()
    signals: list[Signal] = []
    if any(
        term in text
        for term in ["hiring", "team", "recruiting", "headcount", "active job postings"]
    ):
        signals.append(
            Signal(
                signal_type="hiring",
                summary="Conversation notes suggest hiring or team growth.",
                confidence=ConfidenceLabel.MEDIUM,
                reasons=["Submitted notes mention hiring/team growth."],
                source_ids=source_ids,
                inferred=True,
            )
        )
    if any(term in text for term in ["funding", "series a", "series b", "series c", "series d"]):
        signals.append(
            Signal(
                signal_type="funding",
                summary="Enrichment suggests recent or relevant funding context.",
                confidence=ConfidenceLabel.MEDIUM,
                reasons=["Enrichment source mentions funding context."],
                source_ids=source_ids,
                inferred=True,
            )
        )
    if any(term in text for term in ["partner", "partnership", "channel", "ecosystem"]):
        signals.append(
            Signal(
                signal_type="partnerships",
                summary="Conversation notes suggest partnership or channel interest.",
                confidence=ConfidenceLabel.MEDIUM,
                reasons=["Submitted notes mention partnership/channel context."],
                source_ids=source_ids,
                inferred=True,
            )
        )
    if not signals:
        signals.append(
            Signal(
                signal_type="conversation_follow_up",
                summary="Recent in-person conversation creates a timely follow-up opportunity.",
                confidence=ConfidenceLabel.MEDIUM,
                reasons=["The capture itself is a fresh GTM event trigger."],
                source_ids=source_ids,
                inferred=False,
            )
        )
    return signals


def _build_strategy(capture, company, signals: list[Signal], playbook=None) -> PitchStrategy:
    company_name = company.name or "the account"
    primary_signal = signals[0].signal_type.replace("_", " ")
    product_context = _product_context(playbook)
    sector_context = _sector_context(company, playbook)
    positioning_note = (
        playbook.sector_positioning[0] if playbook and playbook.sector_positioning else None
    )
    value_prop = _strategy_value_prop(playbook, positioning_note)
    reasons = ["Uses submitted conversation context and conservative signal detection."]
    if playbook:
        reasons.append(f"Uses saved playbook: {playbook.name}.")
        if playbook.target_personas:
            reasons.append(f"Targets personas including {', '.join(playbook.target_personas[:3])}.")
        if playbook.products_offered:
            reasons.append(
                f"Products/services in scope: {', '.join(playbook.products_offered[:3])}."
            )
        if playbook.target_sectors:
            reasons.append(f"Sector context includes {', '.join(playbook.target_sectors[:3])}.")
        if positioning_note:
            reasons.append(f"Sector-specific positioning: {positioning_note}.")
        if playbook.priority_signals:
            reasons.append(
                f"Prioritizes signals including {', '.join(playbook.priority_signals[:3])}."
            )
        if playbook.research_resources:
            reasons.append(
                f"Agent should prioritize {len(playbook.research_resources)} configured resource(s)."
            )
        if playbook.proof_points:
            reasons.append(f"Uses proof point: {playbook.proof_points[0]}.")
        if playbook.research_freshness_days:
            reasons.append(
                f"Research freshness window: last {playbook.research_freshness_days} days."
            )
    angle_target = primary_signal
    if product_context and sector_context:
        angle_target = f"{product_context} for {sector_context} teams around {primary_signal}"
    elif product_context:
        angle_target = f"{product_context} around {primary_signal}"
    elif sector_context:
        angle_target = f"{sector_context} motion around {primary_signal}"
    return PitchStrategy(
        recommended_angle=f"Reference the recent conversation and connect it to {angle_target}.",
        next_best_action="Send a concise personalized follow-up and create a HubSpot task after approval.",
        pain_hypothesis=(
            f"{company_name} may benefit from a more specific path from event conversations "
            f"to qualified follow-up{_sector_suffix(sector_context)}."
        ),
        value_prop=value_prop,
        suggested_cta=(
            "Ask for a 20-minute follow-up to compare current GTM handoff workflow "
            "against the proposed approach."
        ),
        objections=["Too much automation", "Unclear data accuracy", "Existing CRM workflow already works"],
        confidence=ConfidenceLabel.MEDIUM,
        reasons=reasons,
    )


def _sector_suffix(sector_context: str | None) -> str:
    return f" for {sector_context}" if sector_context else ""


def _strategy_value_prop(playbook, positioning_note: str | None) -> str:
    base = (
        playbook.value_props[0]
        if playbook and playbook.value_props
        else "Turn high-intent event interactions into reviewed, evidence-backed outreach quickly."
    )
    if positioning_note:
        return f"{base} Sector context: {positioning_note}"
    if playbook and playbook.products_offered:
        return f"{base} Relevant product/service: {playbook.products_offered[0]}."
    return base


def _product_context(playbook) -> str | None:
    if playbook and playbook.products_offered:
        return playbook.products_offered[0]
    return None


def _sector_context(company, playbook) -> str | None:
    if not playbook or not playbook.target_sectors:
        return None
    industry = (company.industry or "").lower()
    for sector in playbook.target_sectors:
        if industry and (sector.lower() in industry or industry in sector.lower()):
            return sector
    return playbook.target_sectors[0]


def _merge_company(current, enriched):
    if not enriched:
        return current
    return current.model_copy(
        update={
            "name": enriched.name or current.name,
            "website": enriched.website or current.website,
            "industry": enriched.industry or current.industry,
            "headquarters": enriched.headquarters or current.headquarters,
            "confidence": enriched.confidence,
            "confidence_reasons": [
                *current.confidence_reasons,
                *enriched.confidence_reasons,
            ],
        }
    )


def _playbook_rationale(playbook) -> str:
    parts = []
    if playbook.target_personas:
        parts.append(f"target personas: {', '.join(playbook.target_personas[:3])}")
    if playbook.products_offered:
        parts.append(f"products/services: {', '.join(playbook.products_offered[:3])}")
    if playbook.target_sectors:
        parts.append(f"target sectors: {', '.join(playbook.target_sectors[:3])}")
    if playbook.sector_positioning:
        parts.append(f"sector positioning: {playbook.sector_positioning[0]}")
    if playbook.priority_signals:
        parts.append(f"priority signals: {', '.join(playbook.priority_signals[:3])}")
    if playbook.trusted_sources:
        parts.append(f"trusted sources: {', '.join(playbook.trusted_sources[:3])}")
    if playbook.research_resources:
        parts.append(f"research resources: {', '.join(playbook.research_resources[:3])}")
    if playbook.personalization_rules:
        parts.append(f"personalization rule: {playbook.personalization_rules[0]}")
    if playbook.research_instructions:
        parts.append(f"instructions: {playbook.research_instructions}")
    if parts:
        return "Configured playbook context includes " + "; ".join(parts) + "."
    return "No directed playbook context configured yet."


def _build_drafts(report: ReportRead) -> list[OutreachDraftRead]:
    name = report.contact.name or "there"
    company = report.company.name or "your team"
    angle = report.strategy.recommended_angle
    return [
        OutreachDraftRead(
            capture_id=report.capture_id,
            report_id=report.id,
            channel=DraftChannel.EMAIL,
            draft_type=DraftType.INITIAL_EMAIL,
            subject=f"Following up on {company}",
            body=(
                f"Hi {name},\n\n"
                f"Good speaking with you. {angle}\n\n"
                f"The relevant idea: {report.strategy.value_prop}\n\n"
                f"Would it be useful to compare notes for 20 minutes next week?"
            ),
            inferred_claims_used=any(signal.inferred for signal in report.signals),
            inferred_claim_notes=[signal.summary for signal in report.signals if signal.inferred],
        ),
        OutreachDraftRead(
            capture_id=report.capture_id,
            report_id=report.id,
            channel=DraftChannel.LINKEDIN,
            draft_type=DraftType.LINKEDIN_CONNECTION,
            body=f"Hi {name}, good meeting you. Would be useful to stay connected here.",
            inferred_claims_used=False,
        ),
        OutreachDraftRead(
            capture_id=report.capture_id,
            report_id=report.id,
            channel=DraftChannel.LINKEDIN,
            draft_type=DraftType.LINKEDIN_FOLLOW_UP,
            body=(
                f"Thanks for connecting, {name}. The thread I wanted to continue: "
                f"{report.strategy.value_prop}."
            ),
            inferred_claims_used=False,
        ),
        OutreachDraftRead(
            capture_id=report.capture_id,
            report_id=report.id,
            channel=DraftChannel.EMAIL,
            draft_type=DraftType.NEXT_STEP_EMAIL,
            subject="Next step",
            body=(
                f"Hi {name},\n\n"
                f"Based on our conversation, the practical next step is: "
                f"{report.strategy.suggested_cta}\n\n"
                "If helpful, I can send a short agenda before we meet."
            ),
            inferred_claims_used=any(signal.inferred for signal in report.signals),
            inferred_claim_notes=[signal.summary for signal in report.signals if signal.inferred],
        ),
    ]


def _warnings(contact_name: str | None, company_name: str | None, sources) -> list[str]:
    warnings = []
    if not contact_name:
        warnings.append("Contact name is missing or low confidence.")
    if not company_name or company_name == "Unknown company":
        warnings.append("Company enrichment is incomplete.")
    if not any(source.source_type.startswith("prospeo_") for source in sources):
        warnings.append(
            "Public enrichment is running in local/mock mode until provider keys are configured."
        )
    return warnings
