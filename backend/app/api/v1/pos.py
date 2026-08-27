from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date
import uuid

# Import rào chắn bảo mật
from app.api.v1.users import get_current_user

# Import CSDL giả lập kho hàng từ inventory.py để thực hiện trừ kho
from app.api.v1.inventory import fake_batches_db

router = APIRouter()

# ==========================================
# 1. SCHEMAS (Cấu trúc dữ liệu Giỏ hàng & Hóa đơn)
# ==========================================
class CartItem(BaseModel):
    batch_id: str = Field(..., title="Mã lô thuốc cần xuất")
    quantity: int = Field(..., gt=0, title="Số lượng mua")

class CheckoutRequest(BaseModel):
    items: List[CartItem] = Field(..., title="Danh sách thuốc trong giỏ")
    customer_name: Optional[str] = Field(None, title="Tên khách hàng (Nếu có)")
    customer_phone: Optional[str] = Field(None, title="SĐT Khách hàng")
    discount: float = Field(0.0, ge=0.0, title="Chiết khấu (VND)")
    tax_rate: float = Field(0.08, ge=0.0, title="Thuế suất VAT (Mặc định 8%)")

class InvoiceItem(BaseModel):
    batch_id: str
    med_id: str
    quantity: int
    unit_price: float
    subtotal: float

class InvoiceResponse(BaseModel):
    invoice_id: str
    created_at: datetime
    cashier_username: str
    customer_name: Optional[str]
    items: List[InvoiceItem]
    total_goods_amount: float
    discount_amount: float
    tax_amount: float
    final_amount: float

# ==========================================
# 2. DATABASE GIẢ LẬP (Lưu trữ Hóa đơn)
# ==========================================
fake_invoices_db = []

# ==========================================
# 3. API ENDPOINTS (Nghiệp vụ Bán hàng)
# ==========================================

@router.post("/checkout", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def process_checkout(
    req: CheckoutRequest, 
    current_user: dict = Depends(get_current_user) # Thu ngân, Dược sĩ, Admin đều được bán hàng
):
    """
    API: Xử lý thanh toán (Bán hàng).
    Đáp ứng Yêu cầu 1.4: Tính toán giá tiền, áp dụng thuế/khuyến mãi và trừ tồn kho tự động.
    """
    if not req.items:
        raise HTTPException(status_code=400, detail="Giỏ hàng trống. Vui lòng thêm thuốc vào giỏ.")

    total_goods = 0.0
    invoice_items = []
    
    # BƯỚC 1: KIỂM TRA TỒN KHO & HẠN SỬ DỤNG (VALIDATION)
    # Rất quan trọng: Phải kiểm tra toàn bộ giỏ hàng hợp lệ trước khi tiến hành trừ kho
    for item in req.items:
        # Tìm lô thuốc tương ứng trong kho
        batch = next((b for b in fake_batches_db if b["id"] == item.batch_id), None)
        
        if not batch:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy lô thuốc mã {item.batch_id}")
            
        if batch["quantity"] < item.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Lỗi tồn kho: Lô {item.batch_id} chỉ còn {batch['quantity']} sản phẩm, không đủ bán {item.quantity}."
            )
            
        if batch["exp_date"] <= date.today():
            raise HTTPException(
                status_code=400, 
                detail=f"Cảnh báo GPP: Lô {item.batch_id} đã hết hạn sử dụng. Vui lòng loại bỏ khỏi giỏ hàng!"
            )
            
        # Tính toán tiền cho từng món
        subtotal = batch["retail_price"] * item.quantity
        total_goods += subtotal
        
        invoice_items.append(InvoiceItem(
            batch_id=batch["id"],
            med_id=batch["med_id"],
            quantity=item.quantity,
            unit_price=batch["retail_price"],
            subtotal=subtotal
        ))

    # BƯỚC 2: TÍNH TOÁN TÀI CHÍNH (Thuế & Chiết khấu)
    # Trừ chiết khấu trước, tính thuế VAT sau
    amount_after_discount = total_goods - req.discount
    if amount_after_discount < 0:
        raise HTTPException(status_code=400, detail="Số tiền chiết khấu lớn hơn tổng giá trị đơn hàng.")
        
    tax = amount_after_discount * req.tax_rate
    final_total = amount_after_discount + tax

    # BƯỚC 3: TIẾN HÀNH KHẤU TRỪ TỒN KHO THỰC TẾ
    for item in req.items:
        for b in fake_batches_db:
            if b["id"] == item.batch_id:
                b["quantity"] -= item.quantity # Trừ đi số lượng khách mua
                break

    # BƯỚC 4: TẠO VÀ LƯU HÓA ĐƠN
    invoice_id = f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
    
    new_invoice = {
        "invoice_id": invoice_id,
        "created_at": datetime.now(),
        "cashier_username": current_user["username"], # Ghi nhận ai là người thu tiền
        "customer_name": req.customer_name,
        "items": [i.model_dump() for i in invoice_items],
        "total_goods_amount": total_goods,
        "discount_amount": req.discount,
        "tax_amount": tax,
        "final_amount": final_total
    }
    
    fake_invoices_db.append(new_invoice)
    
    return new_invoice


@router.get("/history", response_model=List[InvoiceResponse])
async def get_invoice_history(current_user: dict = Depends(get_current_user)):
    """
    API: Tra cứu lịch sử hóa đơn bán hàng.
    Phục vụ cho tính năng Thống kê & Báo cáo sau này.
    """
    # Sắp xếp hóa đơn mới nhất lên đầu
    return sorted(fake_invoices_db, key=lambda x: x["created_at"], reverse=True)