from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, captures, crm, drafts, events, reports, reviews, webhooks
from app.config import get_settings
from app.store import InMemoryStore


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="CONNEXTed API", version="0.1.0")
    app.state.settings = settings
    app.state.store = InMemoryStore()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
    app.include_router(captures.router, prefix="/api/captures", tags=["captures"])
    app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
    app.include_router(drafts.router, prefix="/api/drafts", tags=["drafts"])
    app.include_router(reviews.router, prefix="/api/reviews", tags=["reviews"])
    app.include_router(crm.router, prefix="/api/crm", tags=["crm"])
    app.include_router(events.router, prefix="/api/events", tags=["events"])
    app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "env": settings.app_env}

    return app


app = create_app()
