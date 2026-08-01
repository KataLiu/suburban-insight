import os


class Settings:
    """Environment-driven configuration. No secrets are hardcoded here."""

    cors_origins: list[str] = [
        origin.strip()
        for origin in os.environ.get("CORS_ORIGINS", "http://localhost:5500").split(",")
        if origin.strip()
    ]
    data_dir: str = os.environ.get("DATA_DIR", "../data/processed")


settings = Settings()
