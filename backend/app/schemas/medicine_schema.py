from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# ==========================================
# 1. BASE SCHEMA (Cấu trúc gốc dùng chung)
# ==========================================
class MedicineBase(BaseModel):
    """
    Các trường dữ liệu cơ bản của một danh mục Thuốc.
    Dùng Field để mô tả rõ ràng, giúp Swagger UI tự động tạo tài liệu API đẹp mắt.
    """
    name: str = Field(..., title="Tên thuốc thương mại", min_length=2, max_length=255)
    group: str = Field(..., title="Nhóm thuốc", example="Kháng sinh, Giảm đau, Tiêu hóa")
    active_ingredient: str = Field(..., title="Hoạt chất chính")
    
    dosage: str = Field(..., title="Hàm lượng", example="500mg, 10ml, 250IU")
    unit: str = Field(..., title="Đơn vị tính", example="Viên nén, Lọ, Tuýp, Vỉ")
    route: str = Field(..., title="Đường dùng", example="Uống, Tiêm, Bôi ngoài da")
    
    manufacturer: str = Field(..., title="Nhà sản xuất", example="Dược Hậu Giang (DHG)")
    
    reg_number: Optional[str] = Field(
        None, 
        title="Số đăng ký (SĐK)", 
        description="Số đăng ký do Bộ Y tế cấp, mỗi thuốc 1 số duy nhất."
    )
    
    description: Optional[str] = Field(
        None, 
        title="Hướng dẫn sử dụng / Công dụng",
        description="Đoạn văn bản chi tiết dùng để AI đọc và tóm tắt."
    )
    
    is_active: bool = Field(True, description="Trạng thái kinh doanh (Đang bán / Ngừng bán)")


# ==========================================
# 2. CREATE SCHEMA (Dữ liệu đầu vào khi Thêm thuốc)
# ==========================================
class MedicineCreate(MedicineBase):
    """
    Schema dùng khi Dược sĩ/Admin gửi API POST để tạo thuốc mới.
    Do mọi trường bắt buộc đều đã có ở MedicineBase, ta chỉ cần kế thừa (pass).
    """
    pass


# ==========================================
# 3. UPDATE SCHEMA (Dữ liệu đầu vào khi Sửa thuốc)
# ==========================================
class MedicineUpdate(BaseModel):
    """
    Schema dùng khi cập nhật (PUT/PATCH) thông tin thuốc.
    Mọi trường đều là Optional, người dùng sửa trường nào thì gửi trường đó.
    """
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    group: Optional[str] = None
    active_ingredient: Optional[str] = None
    dosage: Optional[str] = None
    unit: Optional[str] = None
    route: Optional[str] = None
    manufacturer: Optional[str] = None
    reg_number: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# ==========================================
# 4. RESPONSE SCHEMA (Dữ liệu đầu ra trả về)
# ==========================================
class MedicineResponse(MedicineBase):
    """
    Schema dùng để format dữ liệu từ Database trả về cho Frontend (React).
    Gắn thêm ID và thời gian.
    """
    id: str = Field(..., title="Mã định danh thuốc (UUID)")
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Quan trọng: Cho phép Pydantic đọc trực tiếp đối tượng SQLAlchemy Model
    model_config = {"from_attributes": True}