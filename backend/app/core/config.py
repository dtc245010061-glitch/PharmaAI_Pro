from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # ==========================================
    # 1. THÔNG TIN CHUNG CỦA HỆ THỐNG
    # ==========================================
    PROJECT_NAME: str = "PharmaAI Pro ERP"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    # ==========================================
    # 2. CẤU HÌNH BẢO MẬT & PHÂN QUYỀN
    # ==========================================
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # ==========================================
    # 3. CORS - TÊN MIỀN FRONTEND
    # ==========================================
    # Pydantic sẽ tự động parse chuỗi JSON từ file .env thành List Python
    BACKEND_CORS_ORIGINS: List[str] = []

    # ==========================================
    # 4. KẾT NỐI CƠ SỞ DỮ LIỆU
    # ==========================================
    # Optional vì hiện tại chúng ta đang dùng mock data, 
    # sau này dùng MySQL/Postgres thì bỏ giá trị mặc định đi.
    DATABASE_URL: str = "sqlite:///./pharma_ai.db"

    # ==========================================
    # 5. CẤU HÌNH AI
    # ==========================================
    AI_PROVIDER: str = "gemini"
    AI_API_KEY: str = ""
    AI_MAX_OUTPUT_TOKENS: int = 1024
    AI_TEMPERATURE: float = 0.1

    # ==========================================
    # NGUỒN ĐỌC BIẾN MÔI TRƯỜNG
    # ==========================================
    # model_config chỉ định Pydantic tìm kiếm file .env ở thư mục gốc
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

# Khởi tạo đối tượng settings để các file khác import vào dùng
settings = Settings()