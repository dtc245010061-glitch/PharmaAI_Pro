from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

# Import Base đã cấu hình từ tầng Database
from app.db.database import Base

class Invoice(Base):
    """
    Mô hình đại diện cho bảng 'invoices' (Hóa đơn tổng).
    Lưu trữ thông tin giao dịch, tổng tiền, thuế, và người lập hóa đơn.
    """
    __tablename__ = "invoices"

    # Khóa chính UUID
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # Mã hóa đơn dễ đọc (VD: INV-20260827-ABCD) để in ra giấy cho khách
    invoice_code = Column(String(50), unique=True, index=True, nullable=False)
    
    # Ghi nhận người thu ngân (Tên đăng nhập) để quy trách nhiệm khi có sai sót
    cashier_username = Column(String(50), nullable=False, index=True)
    
    # Thông tin khách hàng (Có thể để trống nếu khách lẻ không đọc tên)
    customer_name = Column(String(100), nullable=True)
    customer_phone = Column(String(20), nullable=True)
    
    # ==========================================
    # TÀI CHÍNH TỔNG (Dùng để đối soát và báo cáo doanh thu)
    # ==========================================
    total_goods_amount = Column(Float, nullable=False, default=0.0) # Tổng tiền hàng
    discount_amount = Column(Float, nullable=False, default=0.0)    # Tiền chiết khấu
    tax_amount = Column(Float, nullable=False, default=0.0)         # Tiền thuế VAT
    final_amount = Column(Float, nullable=False, default=0.0)       # Tổng tiền khách phải trả
    
    # Thời gian xuất hóa đơn
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # ==========================================
    # QUAN HỆ (RELATIONSHIP)
    # ==========================================
    # Mối quan hệ 1-N: 1 Hóa đơn có nhiều Chi tiết mặt hàng.
    # cascade="all, delete-orphan": Nếu xóa hóa đơn tổng, toàn bộ chi tiết bên trong tự động bị xóa sạch.
    items = relationship("InvoiceItem", backref="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    """
    Mô hình đại diện cho bảng 'invoice_items' (Chi tiết hóa đơn).
    Lưu trữ chính xác Lô thuốc nào đã bán, số lượng bao nhiêu, giá tiền lúc đó là bao nhiêu.
    """
    __tablename__ = "invoice_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # Khóa ngoại trỏ ngược về bảng Invoices tổng
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=False, index=True)
    
    # Khóa ngoại trỏ về bảng Lô hàng (Batches) để biết chính xác đã trừ kho ở lô nào
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=False, index=True)
    
    # ==========================================
    # GHI NHẬN SNAPSHOT (Bản chụp lịch sử)
    # ==========================================
    # Dù sau này có thay đổi giá bán trong kho, thì giá trên hóa đơn cũ vẫn KHÔNG bị thay đổi.
    quantity = Column(Integer, nullable=False)        # Số lượng mua
    unit_price = Column(Float, nullable=False)        # Đơn giá lúc bán
    subtotal = Column(Float, nullable=False)          # Thành tiền (quantity * unit_price)
    
    # Mối quan hệ (Giúp dễ dàng truy xuất thông tin Lô hàng từ Chi tiết hóa đơn)
    batch = relationship("Batch")