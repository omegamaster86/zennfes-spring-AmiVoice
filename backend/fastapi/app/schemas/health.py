"""ヘルスチェック用スキーマ."""

from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス."""

    status: str
    env: str
