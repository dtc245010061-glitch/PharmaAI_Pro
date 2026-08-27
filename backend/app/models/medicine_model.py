from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
import uuid

# Import Base đã cấu hình từ tầng Database
from app.db.database import Base

class Medicine(Base):
    """
    Mô hình đại diện cho bảng 'medicines' (Danh mục thuốc).
    Lưu trữ thông tin chuẩn hóa theo quy định của Cục Quản lý Dược.
    """
    __tablename__ = "medicines"

    # Mã định danh (UUID)
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # ==========================================
    # THÔNG TIN ĐỊNH DANH CƠ BẢN
    # ==========================================
    name = Column(String(255), index=True, nullable=False) # Tên thuốc thương mại
    group = Column(String(100), index=True, nullable=False) # Nhóm thuốc (Kháng sinh, Giảm đau...)
    active_ingredient = Column(String(255), index=True, nullable=False) # Hoạt chất chính
    
    # ==========================================
    # QUY CÁCH VÀ DẠNG BÀO CHẾ
    # ==========================================
    dosage = Column(String(50), nullable=False) # Hàm lượng (vd: 500mg, 10ml)
    unit = Column(String(50), nullable=False) # Đơn vị tính (vd: Viên nén, Tuýp, Lọ)
    route = Column(String(100), nullable=False) # Đường dùng (vd: Uống, Tiêm, Bôi ngoài da)
    
    # ==========================================
    # NGUỒN GỐC & PHÁP LÝ
    # ==========================================
    manufacturer = Column(String(255), nullable=False) # Nhà sản xuất
    # Số đăng ký dược phẩm (Mỗi loại thuốc chỉ có 1 số SĐK duy nhất -> unique=True)
    reg_number = Column(String(100), unique=True, index=True, nullable=True) 
    
    # ==========================================
    # THÔNG TIN Y KHOA (Dùng làm Context cho AI)
    # ==========================================
    # Sử dụng kiểu Text thay vì String để chứa được văn bản dài không giới hạn ký tự
    description = Column(Text, nullable=True) 
    
    # ==========================================
    # TRẠNG THÁI VÀ LỊCH SỬ THAY ĐỔI
    # ==========================================
    is_active = Column(Boolean, default=True) # Xóa mềm (Vô hiệu hóa)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())