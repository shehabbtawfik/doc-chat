from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    openai_api_key: Optional[str] = None
    chroma_persist_dir: str = "./chroma_db"
    embedding_model: str = "text-embedding-3-small"
    chat_model: str = "gpt-4o-mini"
    chunk_size: int = 500
    chunk_overlap: int = 50
    retrieval_k: int = 5
    max_file_size_mb: int = 10

    class Config:
        env_file = ".env"


settings = Settings()
