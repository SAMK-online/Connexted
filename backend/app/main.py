from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, captures, crm, drafts, events, reports, reviews, social, webhooks
from app.config import get_settings
from app.store import create_store


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        await app.state.store.close()

    app = FastAPI(title="CONNEXTed API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.store = create_store(settings)

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
    app.include_router(social.router, prefix="/api/social", tags=["social"])
    app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "env": settings.app_env}

    return app


app = create_app()
