from typing import Generator
from sqlalchemy.orm import Session
import logging

# Import SessionLocal đã được cấu hình từ file database.py
from app.db.database import SessionLocal

logger = logging.getLogger("PharmaAI_Pro.Session")

def get_db() -> Generator[Session, None, None]:
    """
    Dependency Generator: Cấp phát phiên làm việc (Session) với Cơ sở dữ liệu.
    
    Cơ chế hoạt động (Context Manager):
    1. Khi một API được gọi -> Tạo một kết nối DB mới (db = SessionLocal())
    2. Chuyển quyền điều khiển cho API xử lý (yield db)
    3. BẤT KỂ API chạy thành công hay bị lỗi/crash -> Khối 'finally' luôn được gọi 
       để đóng kết nối (db.close()), trả tài nguyên lại cho Server.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        # Nếu có lỗi nghiêm trọng ở mức Database xảy ra trong quá trình API đang chạy,
        # ta có thể bắt log ở đây trước khi kết nối bị đóng.
        logger.error(f"Lỗi phiên giao dịch Database: {e}")
        raise e
    finally:
        # Quan trọng nhất: Luôn luôn đóng kết nối để tránh sập Server do cạn kiệt Pool
        db.close()