from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# ==========================================
# 1. SCHEMAS ĐẦU VÀO (GIỎ HÀNG & THANH TOÁN)
# ==========================================
class CartItem(BaseModel):
    """
    Chi tiết một mặt hàng trong giỏ lúc thanh toán.
    Hệ thống POS luôn chốt theo Lô hàng (Batch) thay vì Mã thuốc tổng (Medicine)
    để đảm bảo trừ đúng tồn kho của lô cận date (FIFO).
    """
    batch_id: str = Field(
        ..., 
        title="Mã định danh Lô thuốc", 
        description="UUID của lô thuốc lấy từ kho"
    )
    quantity: int = Field(
        ..., 
        gt=0, # Ràng buộc: Số lượng mua bắt buộc phải Lớn hơn 0 (Greater Than 0)
        title="Số lượng mua", 
        description="Số lượng khách hàng mua thực tế"
    )

class CheckoutRequest(BaseModel):
    """
    Thông tin toàn bộ giỏ hàng và dữ liệu tài chính gửi lên từ màn hình POS Frontend.
    """
    items: List[CartItem] = Field(
        ..., 
        min_length=1, # Ràng buộc: Giỏ hàng phải có ít nhất 1 món, không được gửi giỏ trống
        title="Danh sách hàng hóa trong giỏ"
    )
    customer_name: Optional[str] = Field(None, title="Tên khách hàng", max_length=100)
    customer_phone: Optional[str] = Field(None, title="Số điện thoại khách", max_length=20)
    
    # Các thông số tính toán tài chính
    discount: float = Field(
        default=0.0, 
        ge=0.0, # Lớn hơn hoặc bằng 0 (Greater than or Equal)
        title="Số tiền chiết khấu (VND)"
    )
    tax_rate: float = Field(
        default=0.08, 
        ge=0.0, 
        le=1.0, # Thuế suất VAT chỉ được phép nằm trong khoảng 0% - 100% (0.0 đến 1.0)
        title="Thuế suất VAT (Mặc định 8% = 0.08)"
    )

# ==========================================
# 2. SCHEMAS ĐẦU RA (TRẢ VỀ HÓA ĐƠN ĐÃ LƯU)
# ==========================================
class InvoiceItemResponse(BaseModel):
    """
    Cấu trúc trả về cho 1 dòng chi tiết hiển thị trên biên lai giấy.
    """
    id: str
    batch_id: str
    quantity: int
    unit_price: float
    subtotal: float

    # Cho phép Pydantic đọc dữ liệu từ SQLAlchemy Model (bảng invoice_items)
    model_config = {"from_attributes": True}

class InvoiceResponse(BaseModel):
    """
    Cấu trúc trả về cho toàn bộ Hóa đơn (Bao gồm cả danh sách các thuốc bên trong).
    """
    id: str
    invoice_code: str
    cashier_username: str
    customer_name: Optional[str]
    customer_phone: Optional[str]
    
    # Tài chính tổng
    total_goods_amount: float
    discount_amount: float
    tax_amount: float
    final_amount: float
    
    created_at: datetime
    
    # Tự động nhúng danh sách các món hàng vào trong hóa đơn tổng (Nested JSON)
    items: List[InvoiceItemResponse] = [] 

    # Cho phép Pydantic đọc dữ liệu từ SQLAlchemy Model (bảng invoices)
    model_config = {"from_attributes": True}