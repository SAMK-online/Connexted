from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_store
from app.schemas import Playbook, PlaybookUpsert, StyleProfile, StyleProfileUpsert
from app.store import AppStore

router = APIRouter()


@router.get("/playbooks", response_model=list[Playbook])
async def list_playbooks(store: AppStore = Depends(get_store)) -> list[Playbook]:
    return await store.list_playbooks()


@router.put("/playbooks/{playbook_id}", response_model=Playbook)
async def update_playbook(
    playbook_id: str,
    payload: PlaybookUpsert,
    store: AppStore = Depends(get_store),
) -> Playbook:
    playbook = await store.update_playbook(playbook_id, payload)
    if not playbook:
        raise HTTPException(status_code=404, detail="Playbook not found")
    return playbook


@router.get("/style-profiles", response_model=list[StyleProfile])
async def list_style_profiles(store: AppStore = Depends(get_store)) -> list[StyleProfile]:
    return await store.list_style_profiles()


@router.put("/style-profiles/{profile_id}", response_model=StyleProfile)
async def update_style_profile(
    profile_id: str,
    payload: StyleProfileUpsert,
    store: AppStore = Depends(get_store),
) -> StyleProfile:
    profile = await store.update_style_profile(profile_id, payload)
    if not profile:
        raise HTTPException(status_code=404, detail="Style profile not found")
    return profile
