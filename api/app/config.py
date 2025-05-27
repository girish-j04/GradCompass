from decouple import config

class Settings:
    DATABASE_URL: str = config("DATABASE_URL")
    SECRET_KEY: str = config("SECRET_KEY")
    ALGORITHM: str = config("ALGORITHM", default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = config("ACCESS_TOKEN_EXPIRE_MINUTES", default=30, cast=int)
    ENVIRONMENT: str = config("ENVIRONMENT", default="development")
    
    # CORS settings
    ALLOWED_ORIGINS = [
        "http://localhost:3000",  # React dev server
        "http://127.0.0.1:3000",
    ]

settings = Settings()