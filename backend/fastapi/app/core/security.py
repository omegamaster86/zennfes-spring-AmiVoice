"""API Key 認証のユーティリティ."""

from __future__ import annotations

import hmac

from app.core.config import Settings


def verify_api_key(provided_key: str, settings: Settings) -> bool:
    """渡された API Key が設定済みのいずれかと一致するかを検証する.

    タイミング攻撃対策のため `hmac.compare_digest` で定数時間比較を行う.
    """
    if not provided_key or not settings.api_keys:
        return False

    return any(hmac.compare_digest(provided_key, valid_key) for valid_key in settings.api_keys)
