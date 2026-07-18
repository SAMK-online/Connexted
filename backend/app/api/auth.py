from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.dependencies import get_request_settings, get_store
from app.config import Settings
from app.schemas import (
    AuthConfig,
    AuthResponse,
    AuthUser,
    InviteCodeRead,
    JoinTeamRequest,
    LoginRequest,
    RegisterOrganizationRequest,
)
from app.security import create_session_token, hash_password, verify_password
from app.store import AppStore

router = APIRouter()


def _auth_response(settings: Settings, user: dict) -> AuthResponse:
    return AuthResponse(token=create_session_token(settings, user), user=AuthUser(**user))


@router.get("/config", response_model=AuthConfig)
async def auth_config(settings: Settings = Depends(get_request_settings)) -> AuthConfig:
    return AuthConfig(auth_required=settings.auth_required)


@router.post("/register", response_model=AuthResponse)
async def register_organization(
    payload: RegisterOrganizationRequest,
    settings: Settings = Depends(get_request_settings),
    store: AppStore = Depends(get_store),
) -> AuthResponse:
    if await store.get_auth_user_by_email(payload.email):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = await store.create_organization_account(
        organization_name=payload.organization_name,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    return _auth_response(settings, user)


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    settings: Settings = Depends(get_request_settings),
    store: AppStore = Depends(get_store),
) -> AuthResponse:
    user = await store.get_auth_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _auth_response(settings, user)


@router.post("/join", response_model=AuthResponse)
async def join_team(
    payload: JoinTeamRequest,
    settings: Settings = Depends(get_request_settings),
    store: AppStore = Depends(get_store),
) -> AuthResponse:
    invite = await store.get_org_invite(payload.invite_code)
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or expired invite code")
    if await store.get_auth_user_by_email(payload.email):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = await store.create_team_member(
        organization_id=invite["organization_id"],
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="rep",
    )
    return _auth_response(settings, user)


@router.get("/me", response_model=AuthUser)
async def me(request: Request, store: AppStore = Depends(get_store)) -> AuthUser:
    claims = getattr(request.state, "auth_claims", None)
    if not claims:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await store.get_auth_user(claims["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    return AuthUser(**user)


@router.post("/invite", response_model=InviteCodeRead)
async def create_invite(request: Request, store: AppStore = Depends(get_store)) -> InviteCodeRead:
    claims = getattr(request.state, "auth_claims", None)
    if not claims:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if claims.get("role") not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Only admins can create invite codes")
    invite = await store.create_org_invite(claims["org"], claims["sub"])
    return InviteCodeRead(
        code=invite["code"],
        organization_id=invite["organization_id"],
        created_at=invite["created_at"],
    )
