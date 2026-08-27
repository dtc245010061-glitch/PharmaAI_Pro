from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import logging

# ==========================================
# 1. IMPORT CÁC MODULE NỘI BỘ (TẦNG API VÀ CORE)
# ==========================================
from app.api.v1 import auth, users, medicines, inventory, pos, ai_chat
from app.core.config import settings
from app.db.database import engine, Base  #Sẽ mở ra khi code xong phần Database


# 2. CẤU HÌNH LOGGING (Ghi nhật ký hoạt động hệ thống)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("PharmaAI_Pro")


# 3. QUẢN LÝ VÒNG ĐỜI ỨNG DỤNG (Lifespan Events)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Chạy khi hệ thống khởi động (Startup)
    logger.info("🚀 Đang khởi động hệ thống PharmaAI Pro ERP...")
    logger.info("Chẩn bị kết nối Cơ sở dữ liệu và tải Mô hình AI...")
    Base.metadata.create_all(bind=engine) # Lệnh tự động tạo bảng SQL
    
    yield # Máy chủ đang hoạt động (Running)
    
    # Chạy khi hệ thống tắt (Shutdown)
    logger.info("🛑 Đang tắt hệ thống. Ngắt kết nối Database an toàn...")


# 4. KHỞI TẠO ỨNG DỤNG FASTAPI

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Hệ thống ERP quản lý nhà thuốc tích hợp AI - Chuẩn GPP",
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)


# 5. CẤU HÌNH BẢO MẬT & CORS

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS, # Lấy danh sách tên miền từ file .env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 6. GLOBAL EXCEPTION HANDLER (Bắt lỗi toàn cục)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Bắt mọi lỗi sập server (500) chưa được xử lý để trả về chuỗi JSON thân thiện,
    tránh làm sập luôn cả ứng dụng Frontend của người dùng.
    """
    logger.error(f"Lỗi hệ thống nghiêm trọng tại {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Đã xảy ra lỗi nội bộ hệ thống. Vui lòng liên hệ Admin."},
    )


# 7. ĐẤU NỐI ROUTERS (Ghép nối toàn bộ API)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication & Security"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users & Roles Management"])
app.include_router(medicines.router, prefix="/api/v1/medicines", tags=["Medicines Directory"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Inventory & FIFO"])
app.include_router(pos.router, prefix="/api/v1/pos", tags=["Point of Sale (POS)"])
app.include_router(ai_chat.router, prefix="/api/v1/ai", tags=["AI Guardrails & Assistant"])


# 8. ROUTE KIỂM TRA SỨC KHỎE (Health Check)

@app.get("/", tags=["Health Check"])
async def root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "message": "PharmaAI Pro API Enterprise is running smoothly."
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)