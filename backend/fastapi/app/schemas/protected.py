"""API Key 認証が必要なエンドポイント用スキーマ."""

from __future__ import annotations

from pydantic import BaseModel


class ProtectedResponse(BaseModel):
    """保護されたエンドポイントのレスポンス."""

    message: str
    api_key_prefix: str
