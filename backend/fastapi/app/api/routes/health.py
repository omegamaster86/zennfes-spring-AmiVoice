"""ヘルスチェックエンドポイント."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import SettingsDep
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def get_health(settings: SettingsDep) -> HealthResponse:
    """サービスの稼働確認."""
    return HealthResponse(status="ok", env=settings.app_env)
