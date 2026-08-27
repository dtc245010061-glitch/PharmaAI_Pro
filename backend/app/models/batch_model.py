from sqlalchemy import Column, String, Integer, Float, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

# Import Base đã cấu hình từ tầng Database
from app.db.database import Base

class Batch(Base):
    """
    Mô hình đại diện cho bảng 'batches' (Lô hàng/Tồn kho).
    Quản lý trực tiếp số lượng tồn kho, giá cả và Hạn sử dụng của từng lô nhập.
    """
    __tablename__ = "batches"

    # Mã định danh lô hàng nội bộ trên hệ thống (UUID)
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # ==========================================
    # LIÊN KẾT KHÓA NGOẠI (FOREIGN KEY)
    # ==========================================
    # Cột này trỏ trực tiếp đến cột 'id' của bảng 'medicines'.
    # Ràng buộc này đảm bảo: Không thể nhập kho cho một loại thuốc chưa được tạo danh mục.
    med_id = Column(String(36), ForeignKey("medicines.id"), nullable=False, index=True)
    
    # Số lô do Nhà sản xuất (NSX) in trên vỏ hộp
    batch_number = Column(String(100), nullable=False, index=True)
    
    # ==========================================
    # QUẢN LÝ DATE (HẠN SỬ DỤNG) & THUẬT TOÁN FIFO
    # ==========================================
    mfg_date = Column(Date, nullable=False) # Ngày sản xuất
    
    # Cực kỳ quan trọng: Đánh index=True cho cột Hạn sử dụng.
    # Vì thuật toán FIFO liên tục phải truy vấn (ORDER BY exp_date ASC) để tìm lô cận date nhất,
    # việc đánh chỉ mục giúp CSDL tìm và sắp xếp hàng nghìn lô thuốc chỉ trong vài mili-giây.
    exp_date = Column(Date, nullable=False, index=True) 
    
    # ==========================================
    # TÀI CHÍNH & TỒN KHO
    # ==========================================
    quantity = Column(Integer, nullable=False, default=0) # Số lượng tồn kho thực tế
    import_price = Column(Float, nullable=False) # Giá vốn nhập vào
    retail_price = Column(Float, nullable=False) # Giá bán lẻ ra cho khách
    
    # Mã nhà cung cấp (Tạm thời lưu String, sau này có bảng Suppliers thì chuyển thành ForeignKey)
    supplier_id = Column(String(100), nullable=True) 
    
    # ==========================================
    # TRẠNG THÁI VÀ LỊCH SỬ THAY ĐỔI
    # ==========================================
    is_active = Column(Boolean, default=True) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ==========================================
    # ĐỊNH NGHĨA QUAN HỆ (RELATIONSHIP)
    # ==========================================
    # Giúp ORM tự động lấy toàn bộ thông tin Thuốc (Tên, hoạt chất...) khi ta gọi lô hàng này
    medicine = relationship("Medicine", backref="batches")