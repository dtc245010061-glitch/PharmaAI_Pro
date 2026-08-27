from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid

# Import hàm kiểm tra bảo mật từ users.py
from app.api.v1.users import get_current_user, get_current_admin

router = APIRouter()

# ==========================================
# 1. RÀO CHẮN PHÂN QUYỀN MỞ RỘNG (Dược sĩ & Admin)
# ==========================================
async def get_manager_user(current_user: dict = Depends(get_current_user)):
    """
    Hàm này cho phép cả Admin và Dược sĩ được truy cập.
    Thu ngân (Cashier) gọi vào sẽ bị chặn lại.
    """
    if current_user.get("role") not in ["admin", "pharmacist"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Đặc quyền bị từ chối: Chỉ Quản trị viên hoặc Dược sĩ mới được thực hiện thao tác này."
        )
    return current_user

# ==========================================
# 2. SCHEMAS (Định nghĩa cấu trúc dữ liệu Thuốc)
# ==========================================
class MedicineBase(BaseModel):
    name: str = Field(..., title="Tên thuốc thương mại")
    group: str = Field(..., title="Nhóm thuốc", example="Kháng sinh, Giảm đau")
    active_ingredient: str = Field(..., title="Hoạt chất chính")
    dosage: str = Field(..., title="Hàm lượng", example="500mg")
    unit: str = Field(..., title="Đơn vị tính", example="Viên nén, Lọ, Tuýp")
    route: str = Field(..., title="Đường dùng", example="Uống, Tiêm, Ngoài da")
    manufacturer: str = Field(..., title="Nhà sản xuất")
    reg_number: Optional[str] = Field(None, title="Số đăng ký (SĐK)")
    description: Optional[str] = Field(None, title="Công dụng/Hướng dẫn cơ bản")
    is_active: bool = True

class MedicineCreate(MedicineBase):
    pass

class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    group: Optional[str] = None
    active_ingredient: Optional[str] = None
    dosage: Optional[str] = None
    unit: Optional[str] = None
    route: Optional[str] = None
    manufacturer: Optional[str] = None
    reg_number: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class MedicineResponse(MedicineBase):
    id: str

# ==========================================
# 3. DATABASE GIẢ LẬP (Mock Data)
# ==========================================
fake_medicines_db = {
    "MED-001": {
        "id": "MED-001",
        "name": "Paracetamol 500mg",
        "group": "Giảm đau, hạ sốt",
        "active_ingredient": "Paracetamol",
        "dosage": "500mg",
        "unit": "Viên nén",
        "route": "Uống",
        "manufacturer": "Dược Hậu Giang",
        "reg_number": "VD-12345-19",
        "description": "Giảm đau các cơn đau nhẹ đến vừa. Hạ sốt.",
        "is_active": True
    },
    "MED-002": {
        "id": "MED-002",
        "name": "Amoxicillin 250mg",
        "group": "Kháng sinh",
        "active_ingredient": "Amoxicillin",
        "dosage": "250mg",
        "unit": "Viên nang",
        "route": "Uống",
        "manufacturer": "Traphaco",
        "reg_number": "VD-67890-20",
        "description": "Điều trị nhiễm khuẩn đường hô hấp, tiết niệu.",
        "is_active": True
    }
}

# ==========================================
# 4. API ENDPOINTS (Nghiệp vụ Quản lý Thuốc)
# ==========================================

@router.get("/", response_model=List[MedicineResponse])
async def search_medicines(
    q: Optional[str] = Query(None, description="Tìm theo tên hoặc hoạt chất"),
    group: Optional[str] = Query(None, description="Lọc theo nhóm thuốc"),
    current_user: dict = Depends(get_current_user) # Ai đăng nhập cũng được xem (kể cả Thu ngân)
):
    """
    API: Lấy danh sách và tra cứu thuốc.
    Đáp ứng Yêu cầu 1.7 trong SRS (Tìm kiếm đa tiêu chí).
    """
    results = list(fake_medicines_db.values())
    
    # Lọc theo từ khóa (Tên hoặc Hoạt chất)
    if q:
        q_lower = q.lower()
        results = [
            med for med in results 
            if q_lower in med["name"].lower() or q_lower in med["active_ingredient"].lower()
        ]
        
    # Lọc theo nhóm thuốc
    if group:
        results = [med for med in results if med["group"].lower() == group.lower()]
        
    # Chỉ trả về những thuốc đang kích hoạt (is_active = True)
    return [med for med in results if med["is_active"]]


@router.post("/", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
async def create_medicine(
    medicine: MedicineCreate, 
    manager_user: dict = Depends(get_manager_user) # Bắt buộc phải là Dược sĩ hoặc Admin
):
    """
    API: Thêm thuốc mới vào danh mục. 
    Đáp ứng Yêu cầu 1.2: Chuẩn hóa phân loại, hoạt chất.
    """
    # Tạo mã thuốc tự động ngẫu nhiên (VD: MED-A1B2C3)
    new_id = f"MED-{str(uuid.uuid4())[:6].upper()}"
    
    new_medicine = medicine.model_dump() # Chuyển Pydantic object thành dictionary
    new_medicine["id"] = new_id
    
    fake_medicines_db[new_id] = new_medicine
    return new_medicine


@router.put("/{med_id}", response_model=MedicineResponse)
async def update_medicine(
    med_id: str, 
    medicine_update: MedicineUpdate, 
    manager_user: dict = Depends(get_manager_user) # Bắt buộc phải là Dược sĩ hoặc Admin
):
    """
    API: Cập nhật thông tin thuốc.
    """
    if med_id not in fake_medicines_db:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã thuốc này trên hệ thống.")
        
    # Lấy dữ liệu cũ
    stored_medicine = fake_medicines_db[med_id]
    
    # Cập nhật các trường mới được truyền lên
    update_data = medicine_update.model_dump(exclude_unset=True)
    stored_medicine.update(update_data)
    
    fake_medicines_db[med_id] = stored_medicine
    return stored_medicine


@router.delete("/{med_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medicine(
    med_id: str, 
    admin_user: dict = Depends(get_current_admin) # Ràng buộc cấp cao nhất: Bắt buộc là Admin
):
    """
    API: Vô hiệu hóa (Xóa mềm) một loại thuốc.
    Đáp ứng chuẩn SRS: Tránh xóa nhầm dữ liệu đang nằm trong hóa đơn, chỉ chuyển is_active = False.
    """
    if med_id not in fake_medicines_db:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã thuốc này.")
        
    # Thay vì xóa hẳn (del), ta vô hiệu hóa nó
    fake_medicines_db[med_id]["is_active"] = False
    
    return None