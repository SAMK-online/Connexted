from datetime import UTC, datetime

from app.providers.ocr import extract_contact
from app.providers.research import enrich_company
from app.schemas import (
    AgentRunRead,
    AgentStep,
    CaptureStatus,
    ConfidenceLabel,
    DraftChannel,
    DraftRegenerateRequest,
    DraftType,
    OutreachDraftRead,
    PitchStrategy,
    ReportRead,
    Signal,
)
from app.store import InMemoryStore


async def run_capture_workflow(store: InMemoryStore, capture_id: str) -> None:
    capture = store.get_capture(capture_id)
    if not capture:
        return

    store.mark_capture_running(capture_id)
    run = AgentRunRead(capture_id=capture_id)
    store.save_agent_run(run)

    try:
        contact = await _run_step(run, "ocr_contact_extraction", extract_contact(capture))
        company, sources = await _run_step(run, "company_enrichment", enrich_company(capture))
        signals = _detect_signals(capture, [source.id for source in sources])
        run.steps.append(
            _complete_step(
                "signal_detection",
                "Detected GTM signals from conversation notes and placeholder enrichment.",
                "Signals are conservative because public research providers are not configured.",
            )
        )
        strategy = _build_strategy(capture, company.name or "the account", signals)
        run.steps.append(
            _complete_step(
                "pitch_strategy",
                "Generated recommended angle, value prop, CTA, and objections.",
                "Strategy uses submitted notes, configurable playbook placeholders, and signal confidence.",
            )
        )
        report = ReportRead(
            capture_id=capture_id,
            contact=contact,
            company=company,
            sources=sources,
            signals=signals,
            strategy=strategy,
            warnings=_warnings(contact.name, company.name),
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
        store.save_agent_run(run)
        store.save_report(report)
        store.mark_capture_review_ready(capture_id, report.warnings)
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
        store.save_agent_run(run)
        capture = store.get_capture(capture_id)
        if capture:
            store.captures[capture_id] = capture.model_copy(
                update={
                    "status": CaptureStatus.FAILED,
                    "warnings": [str(exc)],
                    "updated_at": datetime.now(UTC),
                }
            )


def regenerate_draft(
    store: InMemoryStore, draft_id: str, payload: DraftRegenerateRequest
) -> OutreachDraftRead | None:
    return store.regenerate_draft(draft_id, payload)


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


def _detect_signals(capture, source_ids: list[str]) -> list[Signal]:
    text = f"{capture.raw_text} {capture.notes or ''}".lower()
    signals: list[Signal] = []
    if any(term in text for term in ["hiring", "team", "recruiting", "headcount"]):
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


def _build_strategy(capture, company_name: str, signals: list[Signal]) -> PitchStrategy:
    primary_signal = signals[0].signal_type.replace("_", " ")
    return PitchStrategy(
        recommended_angle=f"Reference the recent conversation and connect it to {primary_signal}.",
        next_best_action="Send a concise personalized follow-up and create a HubSpot task after approval.",
        pain_hypothesis=(
            f"{company_name} may benefit from a faster path from event conversations to qualified follow-up."
        ),
        value_prop="Turn high-intent event interactions into reviewed, evidence-backed outreach quickly.",
        suggested_cta="Ask for a 20-minute follow-up to compare current GTM handoff workflow against the proposed approach.",
        objections=["Too much automation", "Unclear data accuracy", "Existing CRM workflow already works"],
        confidence=ConfidenceLabel.MEDIUM,
        reasons=["Uses submitted conversation context and conservative signal detection."],
    )


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


def _warnings(contact_name: str | None, company_name: str | None) -> list[str]:
    warnings = []
    if not contact_name:
        warnings.append("Contact name is missing or low confidence.")
    if not company_name or company_name == "Unknown company":
        warnings.append("Company enrichment is incomplete.")
    warnings.append("Public enrichment is running in local/mock mode until provider keys are configured.")
    return warnings

