from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext

# ==========================================
# CẤU HÌNH BẢO MẬT & TOKEN
# (Trong thực tế, các biến này sẽ được Import từ file config.py và .env)
# ==========================================
SECRET_KEY = "pharma_ai_super_secret_key_2026_do_not_share"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480 # Token sống trong 8 tiếng (1 ca làm việc)

# Khởi tạo Router cho API
router = APIRouter()

# Cấu hình thuật toán băm mật khẩu (Bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==========================================
# SCHEMAS (Định nghĩa cấu trúc dữ liệu trả về)
# ==========================================
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

# ==========================================
# DATABASE GIẢ LẬP (Tạm thời dùng trước khi nối MySQL/PostgreSQL)
# ==========================================
# Mật khẩu gốc của cả 3 tài khoản đều là "123456" 
# Chuỗi lằng nhằng bên dưới là mật khẩu đã được băm (hash) một chiều để bảo mật
HASHED_PW_123456 = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW" 

fake_users_db = {
    "admin": {"username": "admin", "password": HASHED_PW_123456, "role": "admin"},
    "duocsi": {"username": "duocsi", "password": HASHED_PW_123456, "role": "pharmacist"},
    "thungan": {"username": "thungan", "password": HASHED_PW_123456, "role": "cashier"},
}

# ==========================================
# CÁC HÀM XỬ LÝ BẢO MẬT CỐT LÕI
# ==========================================
def verify_password(plain_password, hashed_password):
    """Hàm so sánh mật khẩu người dùng nhập vào với mật khẩu đã băm trong CSDL"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Hàm sinh ra JWT Token chứa thông tin Username và Role"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ==========================================
# API ENDPOINT: ĐĂNG NHẬP
# ==========================================
@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    API Đăng nhập: 
    - Nhận vào username và password từ Client (Frontend)
    - Kiểm tra tài khoản và mật khẩu
    - Trả về Access Token và Quyền (Role)
    """
    # 1. Tìm user trong cơ sở dữ liệu
    user = fake_users_db.get(form_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại trên hệ thống",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 2. Xác thực mật khẩu
    if not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 3. Tạo JWT Token sau khi xác thực thành công
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]}, 
        expires_delta=access_token_expires
    )
    
    # 4. Trả kết quả về cho Frontend
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"]
    }