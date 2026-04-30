from __future__ import annotations
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # OpenAI (optional — leave blank to use Ollama)
    openai_api_key: Optional[str] = None

    # Ollama (used when openai_api_key is not set)
    ollama_base_url: str = "http://192.168.1.39:11434"

    # Models — defaults work for Ollama
    embedding_model: str = "nomic-embed-text"
    chat_model: str = "qwen2.5:14b"

    # Vector store
    chroma_persist_dir: str = "./chroma_db"

    # Chunking
    chunk_size: int = 500
    chunk_overlap: int = 50
    retrieval_k: int = 5
    max_file_size_mb: int = 10

    @property
    def use_ollama(self) -> bool:
        return not bool(self.openai_api_key)

    @property
    def api_base_url(self) -> str:
        if self.use_ollama:
            return f"{self.ollama_base_url}/v1"
        return "https://api.openai.com/v1"

    @property
    def api_key(self) -> str:
        return self.openai_api_key or "ollama"

    class Config:
        env_file = ".env"


settings = Settings()
