from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import logging

# Import cấu hình đường dẫn CSDL từ file config.py
from app.core.config import settings

logger = logging.getLogger("PharmaAI_Pro.Database")

# ==========================================
# 1. LẤY ĐƯỜNG DẪN KẾT NỐI (DATABASE URL)
# ==========================================
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Cấu hình đặc biệt nếu sử dụng SQLite (để test/phát triển cục bộ)
# (MySQL hay PostgreSQL thì không cần đoạn connect_args này)
connect_args = {}
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# ==========================================
# 2. KHỞI TẠO ĐỘNG CƠ KẾT NỐI (ENGINE)
# ==========================================
# pool_pre_ping=True: Cực kỳ quan trọng cho Enterprise. 
# Nó giúp tự động kiểm tra xem kết nối tới DB còn sống không trước khi gửi lệnh, 
# tránh lỗi hệ thống bị sập vì "MySQL server has gone away".
try:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args=connect_args,
        pool_pre_ping=True,
        echo=False  # Đổi thành True nếu bạn muốn Terminal in ra các câu lệnh SQL thuần
    )
    logger.info("Khởi tạo Database Engine thành công.")
except Exception as e:
    logger.error(f"Lỗi khởi tạo Database Engine: {e}")
    raise e

# ==========================================
# 3. KHỞI TẠO PHIÊN GIAO DỊCH (SESSION)
# ==========================================
# autocommit=False: Ngăn không cho DB tự động lưu dữ liệu. 
# Ta phải gọi db.commit() thủ công để đảm bảo an toàn giao dịch (Atomic).
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ==========================================
# 4. KHỞI TẠO LỚP CƠ SỞ CHO CÁC BẢNG (BASE)
# ==========================================
# Tất cả các file Model (Định nghĩa bảng User, bảng Thuốc, Bảng Lô hàng...)
# sau này đều sẽ kế thừa từ class Base này.
Base = declarative_base()