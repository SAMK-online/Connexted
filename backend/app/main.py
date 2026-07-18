import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import admin, auth, captures, crm, drafts, events, reports, reviews, social, webhooks
from app.config import get_settings
from app.security import decode_session_token
from app.store import create_store

# Browser navigations (OAuth redirects) cannot carry auth headers, and the
# entry points for registration/login must stay reachable without a session.
_AUTH_EXEMPT_PATHS = {
    "/api/crm/hubspot/install",
    "/api/crm/hubspot/callback",
    "/api/auth/config",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/join",
}


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        await app.state.store.close()

    app = FastAPI(title="CONNEXTed API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.store = create_store(settings)

    @app.middleware("http")
    async def authenticate_request(request: Request, call_next):
        path = request.url.path
        if request.method == "OPTIONS" or not path.startswith("/api/"):
            return await call_next(request)

        # Always parse a user session token when one is presented, so identity
        # (org scoping, /me, invites) works even before auth is enforced.
        bearer = request.headers.get("Authorization", "")
        token = bearer.removeprefix("Bearer ").strip() if bearer.startswith("Bearer ") else ""
        claims = decode_session_token(settings, token) if token else None
        request.state.auth_claims = claims

        if path in _AUTH_EXEMPT_PATHS:
            return await call_next(request)

        if claims:
            return await call_next(request)

        # Legacy shared-secret access (service integrations, pilot scripts).
        if settings.api_auth_token:
            api_key = request.headers.get("X-API-Key", "")
            if secrets.compare_digest(bearer, f"Bearer {settings.api_auth_token}") or (
                api_key and secrets.compare_digest(api_key, settings.api_auth_token)
            ):
                return await call_next(request)

        if settings.auth_required or settings.api_auth_token:
            return JSONResponse(
                status_code=401, content={"detail": "Authentication required"}
            )
        return await call_next(request)

    # Added after the auth middleware so CORS is outermost: preflights succeed and
    # 401 responses still carry CORS headers the browser can read.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
    app.include_router(captures.router, prefix="/api/captures", tags=["captures"])
    app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
    app.include_router(drafts.router, prefix="/api/drafts", tags=["drafts"])
    app.include_router(reviews.router, prefix="/api/reviews", tags=["reviews"])
    app.include_router(crm.router, prefix="/api/crm", tags=["crm"])
    app.include_router(events.router, prefix="/api/events", tags=["events"])
    app.include_router(social.router, prefix="/api/social", tags=["social"])
    app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "env": settings.app_env}

    return app


app = create_app()
