from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext

# Import các biến cấu hình bảo mật từ file config.py (Đã lấy từ .env)
from app.core.config import settings

# ==========================================
# 1. CẤU HÌNH THUẬT TOÁN BĂM MẬT KHẨU
# ==========================================
# Sử dụng Bcrypt - Tiêu chuẩn mã hóa mật khẩu an toàn nhất hiện nay
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==========================================
# 2. CÁC HÀM XỬ LÝ MẬT KHẨU
# ==========================================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    So sánh mật khẩu dạng chữ thường (người dùng nhập) 
    với chuỗi mật khẩu đã được băm trong Cơ sở dữ liệu.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Băm (Mã hóa 1 chiều) mật khẩu trước khi lưu xuống Cơ sở dữ liệu.
    """
    return pwd_context.hash(password)


# ==========================================
# 3. HÀM TẠO CHÌA KHÓA ĐĂNG NHẬP (JWT TOKEN)
# ==========================================
def create_access_token(
    subject: Union[str, Any], 
    role: str, 
    expires_delta: timedelta = None
) -> str:
    """
    Tạo ra mã JSON Web Token (JWT) khi đăng nhập thành công.
    - subject: Thường là username hoặc user_id
    - role: Quyền của người dùng (admin, pharmacist, cashier)
    """
    # Thiết lập thời gian hết hạn của phiên đăng nhập
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        
    # Đóng gói dữ liệu (Payload) vào Token
    to_encode = {
        "exp": expire, 
        "sub": str(subject), 
        "role": role
    }
    
    # Mã hóa chuỗi token bằng Khóa bí mật (SECRET_KEY)
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt