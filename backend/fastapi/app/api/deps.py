"""FastAPI の依存関係 (API Key 認証・設定注入)."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.core.config import Settings, get_settings
from app.core.security import verify_api_key

SettingsDep = Annotated[Settings, Depends(get_settings)]

API_KEY_HEADER_NAME = "X-API-Key"

api_key_scheme = APIKeyHeader(name=API_KEY_HEADER_NAME, auto_error=False)


def require_api_key(
    settings: SettingsDep,
    api_key: Annotated[str | None, Security(api_key_scheme)],
) -> str:
    """`X-API-Key` ヘッダの API Key を検証し、有効な場合に文字列として返す.

    Raises:
        HTTPException: キー未設定 / 不正時に 401 を返す.

    """
    if not settings.api_keys:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API_KEYS is not configured on the server",
        )

    if not api_key or not verify_api_key(api_key, settings):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    return api_key


ApiKeyDep = Annotated[str, Depends(require_api_key)]
