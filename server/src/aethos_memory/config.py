import os
from pydantic import BaseModel, Field


class Config(BaseModel):
    supabase_url: str = Field(..., description="Supabase Project URL")
    supabase_service_role_key: str = Field(..., description="Supabase Service Role Key")
    groq_api_key: str = Field(..., description="Groq API Key")
    openrouter_api_key: str = Field(default="", description="OpenRouter API Key (optional fallback)")
    gemini_api_key: str = Field(..., description="Gemini API Key for embeddings")
    aethos_user_id: str = Field(..., description="Aethos User ID")
    aethos_project: str = Field(default="global", description="Aethos Project Tag")

    @classmethod
    def load_from_env(cls) -> "Config":
        # Only truly required keys — OPENROUTER_API_KEY is optional fallback
        required_vars = [
            "SUPABASE_URL",
            "SUPABASE_SERVICE_ROLE_KEY",
            "GROQ_API_KEY",
            "GEMINI_API_KEY",
            "AETHOS_USER_ID",
        ]

        missing = [var for var in required_vars if not os.getenv(var)]
        if missing:
            missing_str = ", ".join(missing)
            raise RuntimeError(
                f"Aethos Memory server failed to start: Missing required environment variable(s): {missing_str}. "
                "Please configure these variables in your MCP client settings."
            )

        return cls(
            supabase_url=os.environ["SUPABASE_URL"],
            supabase_service_role_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"],
            groq_api_key=os.environ["GROQ_API_KEY"],
            openrouter_api_key=os.getenv("OPENROUTER_API_KEY", ""),  # optional
            gemini_api_key=os.environ["GEMINI_API_KEY"],
            aethos_user_id=os.environ["AETHOS_USER_ID"],
            aethos_project=os.getenv("AETHOS_PROJECT", "global"),
        )


# Global lazy or eager config accessor
config: Config | None = None


def get_config() -> Config:
    global config
    if config is None:
        config = Config.load_from_env()
    return config
