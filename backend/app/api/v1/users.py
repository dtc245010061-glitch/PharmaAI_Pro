from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from typing import List, Optional
from jose import JWTError, jwt

# Import cơ sở dữ liệu giả lập và thuật toán băm mật khẩu từ file auth.py
from app.api.v1.auth import fake_users_db, pwd_context, SECRET_KEY, ALGORITHM

router = APIRouter()

# Cấu hình Bearer Token (Lấy token từ Header của request)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# ==========================================
# 1. SCHEMAS (Định nghĩa cấu trúc dữ liệu Pydantic)
# ==========================================
class UserResponse(BaseModel):
    username: str
    role: str
    email: Optional[str] = None
    is_active: bool = True

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    role: str = Field(..., pattern="^(admin|pharmacist|cashier)$")
    email: Optional[str] = None

class UserUpdate(BaseModel):
    role: Optional[str] = Field(None, pattern="^(admin|pharmacist|cashier)$")
    is_active: Optional[bool] = None

# ==========================================
# 2. DEPENDENCIES (Hàm rào chắn bảo mật & Phân quyền)
# ==========================================
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Hàm giải mã JWT Token. 
    Bất cứ API nào gọi hàm này đều yêu cầu người dùng phải đăng nhập trước.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin đăng nhập (Token không hợp lệ hoặc đã hết hạn)",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Giải mã token để lấy username và role
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = fake_users_db.get(username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_admin(current_user: dict = Depends(get_current_user)):
    """Rào chắn cấp 2: Kiểm tra xem user có phải là Admin không"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Đặc quyền bị từ chối: Chỉ Quản trị viên (Admin) mới có quyền thực hiện hành động này."
        )
    return current_user

# ==========================================
# 3. API ENDPOINTS (Các điểm nối API)
# ==========================================

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    """API Xem thông tin cá nhân (Ai đăng nhập cũng xem được)"""
    return current_user

@router.get("/", response_model=List[UserResponse])
async def read_all_users(admin_user: dict = Depends(get_current_admin)):
    """API Xem danh sách tất cả tài khoản (Chỉ Admin)"""
    # Trả về danh sách user từ CSDL (ẩn mật khẩu)
    return [user for username, user in fake_users_db.items()]

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_in: UserCreate, admin_user: dict = Depends(get_current_admin)):
    """
    API Tạo tài khoản mới (Chỉ Admin). 
    Đáp ứng yêu cầu 1.1 trong tài liệu SRS.
    """
    if user_in.username in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập này đã tồn tại trên hệ thống."
        )
    
    # Băm mật khẩu trước khi lưu
    hashed_password = pwd_context.hash(user_in.password)
    
    # Lưu vào CSDL
    new_user = {
        "username": user_in.username,
        "password": hashed_password,
        "role": user_in.role,
        "email": user_in.email,
        "is_active": True
    }
    fake_users_db[user_in.username] = new_user
    
    return new_user

@router.delete("/{username}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(username: str, admin_user: dict = Depends(get_current_admin)):
    """API Xóa/Vô hiệu hóa tài khoản (Chỉ Admin)"""
    if username not in fake_users_db:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    
    if username == "admin":
        raise HTTPException(status_code=400, detail="Không thể xóa tài khoản Admin gốc của hệ thống.")
        
    del fake_users_db[username]
    return None