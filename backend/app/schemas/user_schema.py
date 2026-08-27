from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

# ==========================================
# 1. BASE SCHEMA (Cấu trúc gốc dùng chung)
# ==========================================
class UserBase(BaseModel):
    """Các trường dữ liệu cơ bản nhất của một User"""
    username: str = Field(
        ..., 
        min_length=3, 
        max_length=50, 
        description="Tên đăng nhập viết liền không dấu"
    )
    # Ràng buộc role chỉ được nhập đúng 1 trong 3 giá trị bằng Regex
    role: str = Field(
        default="cashier", 
        pattern="^(admin|pharmacist|cashier)$", 
        description="Quyền: admin, pharmacist, cashier"
    )
    # Tự động validate định dạng email (VD: abc@gmail.com)
    email: Optional[EmailStr] = Field(None, description="Email liên hệ")
    is_active: bool = Field(True, description="Tài khoản có đang hoạt động không?")

# ==========================================
# 2. CREATE SCHEMA (Dữ liệu đầu vào khi Tạo mới)
# ==========================================
class UserCreate(UserBase):
    """
    Dữ liệu yêu cầu khi Admin tạo tài khoản mới.
    Kế thừa toàn bộ từ UserBase và bắt buộc phải có thêm mật khẩu.
    """
    password: str = Field(
        ..., 
        min_length=6, 
        description="Mật khẩu dạng chữ thường (Sẽ được băm trước khi lưu)"
    )

# ==========================================
# 3. UPDATE SCHEMA (Dữ liệu đầu vào khi Cập nhật)
# ==========================================
class UserUpdate(BaseModel):
    """
    Dữ liệu yêu cầu khi cập nhật tài khoản.
    Tất cả các trường đều là Optional (Có thể truyền 1 hoặc nhiều trường cần sửa).
    """
    role: Optional[str] = Field(None, pattern="^(admin|pharmacist|cashier)$")
    is_active: Optional[bool] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)

# ==========================================
# 4. RESPONSE SCHEMA (Dữ liệu đầu ra trả về cho Frontend)
# ==========================================
class UserResponse(UserBase):
    """
    Dữ liệu trả về cho Frontend qua API.
    Bao gồm thông tin cơ bản + ID + Thời gian tạo.
    TUYỆT ĐỐI KHÔNG chứa trường password ở đây để bảo mật.
    """
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Cấu hình cực kỳ quan trọng giúp Pydantic đọc được dữ liệu dạng Object của SQLAlchemy
    model_config = {"from_attributes": True}