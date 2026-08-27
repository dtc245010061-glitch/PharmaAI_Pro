from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, timedelta
import uuid

# Import hàm kiểm tra bảo mật từ users.py
from app.api.v1.users import get_current_user

router = APIRouter()

# ==========================================
# 1. RÀO CHẮN PHÂN QUYỀN KHO (Chỉ Admin & Dược sĩ)
# ==========================================
async def get_manager_user(current_user: dict = Depends(get_current_user)):
    """Ngăn chặn Thu ngân tự ý nhập hàng hoặc sửa lô thuốc."""
    if current_user.get("role") not in ["admin", "pharmacist"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Đặc quyền bị từ chối: Chỉ Quản lý kho, Dược sĩ hoặc Admin mới được nhập lô hàng."
        )
    return current_user

# ==========================================
# 2. SCHEMAS (Cấu trúc dữ liệu Lô hàng - Batch)
# ==========================================
class BatchBase(BaseModel):
    med_id: str = Field(..., title="Mã thuốc")
    batch_number: str = Field(..., title="Số lô do NSX cấp", example="L1023")
    mfg_date: date = Field(..., title="Ngày sản xuất")
    exp_date: date = Field(..., title="Hạn sử dụng")
    quantity: int = Field(..., gt=0, title="Số lượng tồn kho")
    import_price: float = Field(..., gt=0, title="Giá nhập")
    retail_price: float = Field(..., gt=0, title="Giá bán lẻ")
    supplier_id: Optional[str] = Field(None, title="Mã nhà cung cấp")

class BatchCreate(BatchBase):
    pass

class BatchResponse(BatchBase):
    id: str
    days_left: int # Số ngày còn lại tính từ hôm nay

# ==========================================
# 3. DATABASE GIẢ LẬP (Lô hàng tồn kho)
# ==========================================
fake_batches_db = [
    {
        "id": "BATCH-001", "med_id": "MED-001", "batch_number": "L-2024A",
        "mfg_date": date(2024, 1, 1), "exp_date": date(2026, 9, 15), # Sắp hết hạn
        "quantity": 50, "import_price": 25000, "retail_price": 35000, "supplier_id": "SUP-01"
    },
    {
        "id": "BATCH-002", "med_id": "MED-001", "batch_number": "L-2025B",
        "mfg_date": date(2025, 2, 1), "exp_date": date(2028, 2, 1), # Hạn còn rất dài
        "quantity": 200, "import_price": 26000, "retail_price": 35000, "supplier_id": "SUP-01"
    },
    {
        "id": "BATCH-003", "med_id": "MED-002", "batch_number": "AMX-099",
        "mfg_date": date(2024, 5, 1), "exp_date": date(2026, 9, 5), # Rất cận date
        "quantity": 10, "import_price": 45000, "retail_price": 55000, "supplier_id": "SUP-02"
    }
]

# ==========================================
# 4. API ENDPOINTS (Nghiệp vụ Kho & FIFO)
# ==========================================

@router.get("/", response_model=List[BatchResponse])
async def get_inventory(
    med_id: Optional[str] = Query(None, description="Lọc theo mã thuốc"),
    current_user: dict = Depends(get_current_user)
):
    """
    API: Lấy danh sách tồn kho, áp dụng quy tắc FIFO (đầu vào đầu ra).
    Đáp ứng Yêu cầu 1.3 và 1.4 trong SRS: Thuốc cận date sẽ được đẩy lên đầu tiên.
    """
    results = fake_batches_db
    if med_id:
        results = [b for b in results if b["med_id"] == med_id]
        
    # Loại bỏ các lô đã hết số lượng (tồn kho = 0)
    results = [b for b in results if b["quantity"] > 0]
    
    # THUẬT TOÁN FIFO: Sắp xếp danh sách lô hàng theo Hạn sử dụng (exp_date) tăng dần.
    # Lô nào ngày hết hạn càng nhỏ (càng gần hiện tại) sẽ nằm ở đầu danh sách để ưu tiên bán.
    results.sort(key=lambda x: x["exp_date"])
    
    # Tính toán thêm "Số ngày còn lại" (days_left) cho Frontend dễ hiển thị
    response_data = []
    today = date.today()
    for b in results:
        b_copy = b.copy()
        b_copy["days_left"] = (b["exp_date"] - today).days
        response_data.append(b_copy)
        
    return response_data


@router.post("/", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
async def import_batch(
    batch: BatchCreate,
    manager_user: dict = Depends(get_manager_user)
):
    """
    API: Nhập lô thuốc mới.
    Chỉ Admin và Dược sĩ mới được phép gọi API này.
    """
    # Ràng buộc nghiệp vụ: Không được nhập hàng đã hết hạn
    if batch.exp_date <= date.today():
        raise HTTPException(
            status_code=400, 
            detail="Lỗi GPP: Không được phép nhập lô thuốc đã quá hạn sử dụng vào hệ thống!"
        )
        
    # Ràng buộc nghiệp vụ: Ngày SX không được lớn hơn Ngày HSD
    if batch.mfg_date >= batch.exp_date:
        raise HTTPException(status_code=400, detail="Lỗi dữ liệu: Ngày sản xuất phải trước Hạn sử dụng.")

    new_id = f"BATCH-{str(uuid.uuid4())[:6].upper()}"
    new_batch = batch.model_dump()
    new_batch["id"] = new_id
    
    fake_batches_db.append(new_batch)
    
    # Tính số ngày còn lại để trả về
    new_batch["days_left"] = (new_batch["exp_date"] - date.today()).days
    return new_batch


@router.get("/alerts/expiry")
async def get_expiry_alerts(
    days_threshold: int = Query(30, description="Ngưỡng cảnh báo (mặc định 30 ngày)"),
    current_user: dict = Depends(get_current_user)
):
    """
    API: Cảnh báo thuốc sắp hết hạn.
    Đáp ứng Yêu cầu 1.5.1: Tìm các lô thuốc có HSD còn lại dưới ngưỡng cho phép.
    Sau này sẽ cấp dữ liệu này cho module "AI Đề xuất tài chính" để AI khuyên Giảm giá hay Đổi trả.
    """
    today = date.today()
    warning_date = today + timedelta(days=days_threshold)
    
    alerts = []
    for b in fake_batches_db:
        if b["quantity"] > 0 and b["exp_date"] <= warning_date:
            days_left = (b["exp_date"] - today).days
            alerts.append({
                "batch_id": b["id"],
                "med_id": b["med_id"],
                "exp_date": b["exp_date"],
                "days_left": days_left,
                "quantity": b["quantity"],
                "status": "EXPIRED" if days_left < 0 else "WARNING"
            })
            
    # Xếp lô khẩn cấp nhất (ít ngày nhất) lên đầu
    alerts.sort(key=lambda x: x["days_left"])
    return {"total_alerts": len(alerts), "threshold_days": days_threshold, "data": alerts}