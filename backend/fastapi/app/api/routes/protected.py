"""API Key 認証が必要なサンプルエンドポイント."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import ApiKeyDep
from app.schemas.protected import ProtectedResponse

router = APIRouter(prefix="/protected", tags=["protected"])


@router.get("", response_model=ProtectedResponse)
def read_protected(api_key: ApiKeyDep) -> ProtectedResponse:
    """API Key 認証の動作確認用エンドポイント.

    検証成功時、キーの先頭数文字だけを返す（ログやレスポンスにキー全体を載せないため）.
    """
    prefix = api_key[:4] + "…" if len(api_key) > 4 else "***"
    return ProtectedResponse(
        message="authenticated",
        api_key_prefix=prefix,
    )
