"""FastAPI アプリケーションのエントリポイント."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, protected
from app.core.config import get_settings


def create_app() -> FastAPI:
    """FastAPI アプリケーションファクトリ."""
    settings = get_settings()

    app = FastAPI(
        title="dev-starter API",
        description="FastAPI backend for dev-starter",
        version="0.1.0",
        debug=settings.app_debug,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api_router_prefix = "/api/v1"
    app.include_router(health.router, prefix=api_router_prefix)
    app.include_router(protected.router, prefix=api_router_prefix)

    return app


app = create_app()
