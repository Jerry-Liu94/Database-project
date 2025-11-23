from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# 1. 定義 Version (版本) 要顯示什麼欄位
class VersionOut(BaseModel):
    version_number: int
    storage_path: str
    created_at: datetime

    class Config:
        # 這行是關鍵！告訴 Pydantic 它可以讀取 SQLAlchemy 的 ORM 物件
        from_attributes = True 

# 2. 定義 User (使用者) 要顯示什麼欄位 (密碼絕對不能顯示！)
class UserOut(BaseModel):
    user_id: int
    email: str
    # 這裡不寫 password_hash，這樣回傳時就會自動過濾掉

    class Config:
        from_attributes = True

# 3. 定義 Asset (資產) 要顯示什麼，包含上面的 Version 和 User
class AssetOut(BaseModel):
    asset_id: int
    filename: str
    file_type: Optional[str] = None
    latest_version_id: Optional[int] = None

    # [魔法發生處] 這裡的變數名稱必須跟 models.py 裡的 relationship 名稱一樣
    latest_version: Optional[VersionOut] = None
    uploader: Optional[UserOut] = None

    class Config:
        from_attributes = True
        
# 新增: Token 回傳格式
class Token(BaseModel):
    access_token: str
    token_type: str

# 新增: Token 裡面包的資料 (通常放 user_id 或 email)
class TokenData(BaseModel):
    email: Optional[str] = None
    
# [新增] 註冊用的資料格式 (UserCreate)
class UserCreate(BaseModel):
    email: str
    password: str