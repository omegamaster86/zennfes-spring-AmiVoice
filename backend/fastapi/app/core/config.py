"""アプリケーション設定."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """環境変数から読み込むアプリ設定."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: str = Field(default="local", description="実行環境 (local/staging/production)")
    app_debug: bool = Field(default=False, description="デバッグモード")
    app_host: str = Field(default="0.0.0.0", description="バインドするホスト")
    app_port: int = Field(default=8000, description="バインドするポート")

    # `NoDecode` で pydantic-settings の JSON 自動パースを抑止し、
    # field_validator(mode="before") でカンマ区切り文字列を分解する.
    cors_allow_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"],
        description="CORS で許可するオリジン (カンマ区切り)",
    )

    api_keys: Annotated[list[str], NoDecode] = Field(
        default_factory=list,
        description="API 認証に利用する API Key 一覧 (カンマ区切り)",
    )

    @field_validator("cors_allow_origins", "api_keys", mode="before")
    @classmethod
    def _split_comma_separated(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """設定のシングルトンインスタンスを返す."""
    return Settings()
