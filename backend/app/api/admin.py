from fastapi import APIRouter

from app.schemas import Playbook, StyleProfile

router = APIRouter()


@router.get("/playbooks", response_model=list[Playbook])
async def list_playbooks() -> list[Playbook]:
    return [
        Playbook(
            id="default-playbook",
            name="Default GTM Playbook",
            icp_segments=["B2B software", "partnership-led growth"],
            disqualifiers=["student project", "non-business use"],
            value_props=["Increase speed from event conversation to reviewed outreach"],
        )
    ]


@router.get("/style-profiles", response_model=list[StyleProfile])
async def list_style_profiles() -> list[StyleProfile]:
    return [
        StyleProfile(
            id="default-style",
            name="Default concise executive",
            tone="direct, useful, low-hype",
            banned_phrases=["just checking in", "hope you're doing well"],
            cta_style="specific next step",
        )
    ]

