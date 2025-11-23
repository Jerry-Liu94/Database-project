from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext

# 1. 設定參數 (實務上這些應該放在環境變數，作業先寫死)
SECRET_KEY = "secret_key_for_redant_project_demo" # 請隨意修改亂碼
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 2. 設定密碼雜湊工具 (使用 bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 功能 A: 驗證密碼 (比對使用者輸入的 vs 資料庫存的亂碼)
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# 功能 B: 產生密碼雜湊 (註冊用，目前暫時用不到，但未來會用)
def get_password_hash(password):
    return pwd_context.hash(password)

# 功能 C: 產生 JWT Token
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    # 將過期時間加入資料中
    to_encode.update({"exp": expire})
    # 簽名並產生 Token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

