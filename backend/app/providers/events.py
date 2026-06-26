from app.schemas import (
    ConfidenceLabel,
    DraftChannel,
    EventAttendee,
    EventDiscoveryRead,
    EventDiscoveryRequest,
    EventOutreachDraft,
    EventSource,
    IndustryEventRead,
    new_id,
)


async def discover_industry_events(payload: EventDiscoveryRequest) -> EventDiscoveryRead:
    """Mockable Event Radar discovery provider.

    Production implementation should use Tavily/public web search and source extraction,
    then rank events and public speakers/sponsors/exhibitors against ICP playbooks.
    """

    discovery_id = new_id("evdisc")
    event_specs = _event_specs(payload)
    events = [_build_event(payload, discovery_id, spec, index) for index, spec in enumerate(event_specs)]
    return EventDiscoveryRead(
        id=discovery_id,
        organization_id=payload.organization_id,
        rep_id=payload.rep_id,
        request=payload,
        events=events,
        warnings=[
            "Event Radar is using mock discovery until Tavily/public web providers are configured.",
            (
                "Attendees are limited to public speakers, sponsors, exhibitors, organizers, "
                "or explicitly listed attendees."
            ),
        ],
    )


def _event_specs(payload: EventDiscoveryRequest) -> list[dict[str, str]]:
    industry = payload.industry.strip() or "GTM"
    region = payload.region or "North America"
    return [
        {
            "name": f"{industry} Growth Summit",
            "type": "conference",
            "location": region,
            "reason": (
                f"Strong fit for {industry} teams evaluating growth, partnerships, "
                "and go-to-market systems."
            ),
        },
        {
            "name": f"{industry} Partnerships Forum",
            "type": "partner_event",
            "location": region,
            "reason": "Likely to surface channel, ecosystem, and partner-led expansion conversations.",
        },
        {
            "name": f"{industry} Revenue Leadership Roundtable",
            "type": "executive_roundtable",
            "location": region,
            "reason": (
                "Useful for finding decision makers with active pipeline, expansion, "
                "and operational priorities."
            ),
        },
    ][: payload.max_events]


def _build_event(
    payload: EventDiscoveryRequest,
    discovery_id: str,
    spec: dict[str, str],
    index: int,
) -> IndustryEventRead:
    event_id = new_id("evt")
    source = EventSource(
        source_type="public_web_placeholder",
        title=f"{spec['name']} public listing",
        url=None,
        snippet=(
            "Placeholder event source. Production discovery should store the event website, "
            "agenda, speaker, sponsor, and exhibitor source URLs."
        ),
        confidence=ConfidenceLabel.LOW,
    )
    attendees = _build_attendees(payload, event_id, [source.id], index)
    event = IndustryEventRead(
        id=event_id,
        organization_id=payload.organization_id,
        discovery_request_id=discovery_id,
        name=spec["name"],
        event_type=spec["type"],
        location=spec["location"],
        starts_on=payload.date_start,
        ends_on=payload.date_end,
        website_url=None,
        relevance_summary=spec["reason"],
        fit_reasons=[
            "Matches requested industry.",
            "Contains public roles likely relevant to sales or partnership outreach.",
            "Can generate pre-event meeting requests before a rep attends.",
        ],
        confidence=ConfidenceLabel.LOW,
        sources=[source],
        attendees=attendees,
    )
    event.drafts = _build_event_drafts(event)
    return event


def _build_attendees(
    payload: EventDiscoveryRequest,
    event_id: str,
    source_ids: list[str],
    event_index: int,
) -> list[EventAttendee]:
    persona = payload.personas[0] if payload.personas else "GTM leader"
    vertical = payload.verticals[0] if payload.verticals else payload.industry
    candidates = [
        {
            "name": "Public Speaker Candidate",
            "title": f"VP {persona}",
            "company": f"{vertical} Operator Co.",
            "role": "speaker",
            "angle": "Reference their event session and ask to compare notes before the event.",
        },
        {
            "name": "Sponsor Lead Candidate",
            "title": "Head of Partnerships",
            "company": f"{vertical} Partner Network",
            "role": "sponsor",
            "angle": "Connect around partner-led growth and event pipeline conversion.",
        },
        {
            "name": "Exhibitor Candidate",
            "title": "Revenue Operations Director",
            "company": f"{vertical} Systems Group",
            "role": "exhibitor",
            "angle": "Position the platform as a way to convert booth conversations into reviewed follow-up.",
        },
    ]
    attendee_count = 2 if event_index == 0 else 3
    attendees = []
    for candidate in candidates[:attendee_count]:
        attendees.append(
            EventAttendee(
                event_id=event_id,
                name=candidate["name"],
                title=candidate["title"],
                company=candidate["company"],
                attendee_role=candidate["role"],
                relevance_reason=(
                    f"Public {candidate['role']} role suggests they are reachable and relevant "
                    f"to {payload.industry} GTM conversations."
                ),
                suggested_angle=candidate["angle"],
                confidence=ConfidenceLabel.LOW,
                source_ids=source_ids,
                inferred=True,
            )
        )
    return attendees


def _build_event_drafts(event: IndustryEventRead) -> list[EventOutreachDraft]:
    drafts: list[EventOutreachDraft] = []
    for attendee in event.attendees:
        drafts.append(
            EventOutreachDraft(
                event_id=event.id,
                attendee_id=attendee.id,
                channel=DraftChannel.EMAIL,
                subject=f"Before {event.name}",
                body=(
                    f"Hi {attendee.name},\n\n"
                    f"I saw you are listed as a {attendee.attendee_role} for {event.name}. "
                    f"{attendee.suggested_angle}\n\n"
                    "Would a short pre-event conversation be useful?"
                ),
                inferred_claims_used=attendee.inferred,
            )
        )
    return drafts
