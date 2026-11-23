from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALLOWED_EMAIL_DOMAIN: str = ""  # Leave empty to allow any email during testing
    CORS_ORIGINS: str = "http://localhost:5173"

    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    HF_TOKEN: str

    class Config:
        env_file = ".env"


settings = Settings()
