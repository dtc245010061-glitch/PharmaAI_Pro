from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
import uuid

# Import Base đã cấu hình từ tầng Database
from app.db.database import Base

class User(Base):
    """
    Mô hình đại diện cho bảng 'users' trong cơ sở dữ liệu.
    Lưu trữ thông tin đăng nhập, vai trò (phân quyền) và trạng thái của nhân viên.
    """
    # Tên bảng thực tế sẽ được tạo dưới Database (MySQL/PostgreSQL)
    __tablename__ = "users"

    # Các cột dữ liệu (Columns)
    # Sử dụng UUID làm Khóa chính (Primary Key) thay vì số tự tăng (Auto Increment) 
    # để tăng tính bảo mật cho hệ thống Enterprise, chống đoán ID.
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # Thông tin tài khoản
    username = Column(String(50), unique=True, index=True, nullable=False)
    
    # Mật khẩu BẮT BUỘC phải lưu dưới dạng đã băm (Hashed) dài 255 ký tự
    hashed_password = Column(String(255), nullable=False)
    
    email = Column(String(100), unique=True, index=True, nullable=True)
    
    # Quyền hạn: admin, pharmacist, cashier
    role = Column(String(20), nullable=False, default="cashier")
    
    # Cờ trạng thái: Khi xóa user, ta chỉ chuyển is_active = False (Xóa mềm - Soft Delete)
    is_active = Column(Boolean, default=True)
    
    # Audit trail (Lưu dấu vết thời gian)
    # server_default=func.now(): DB tự động điền giờ lúc tạo tài khoản
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # onupdate=func.now(): Tự động cập nhật lại thời gian mỗi khi có người đổi pass/đổi quyền
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())