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
    user_name: str
    role_id : int
    # 這裡不寫 password_hash，這樣回傳時就會自動過濾掉

    class Config:
        from_attributes = True

class MetadataOut(BaseModel):
    filesize: Optional[int] = None
    resolution: Optional[str] = None
    duration: Optional[str] = None
    encoding_format: Optional[str] = None
    class Config:
        from_attributes = True

# 3. 定義 Asset (資產) 要顯示什麼，包含上面的 Version 和 User
class AssetOut(BaseModel):
    asset_id: int
    filename: str
    file_type: Optional[str] = None
    latest_version_id: Optional[int] = None
    metadata_info: Optional[MetadataOut] = None
    
    download_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    
    # [魔法發生處] 這裡的變數名稱必須跟 models.py 裡的 relationship 名稱一樣
    latest_version: Optional[VersionOut] = None
    uploader: Optional[UserOut] = None

    tags: List["TagOut"] = []  # 預設是空清單
    
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
    user_name: str
    
class AdminUserCreate(BaseModel):
    user_name: str
    email: str
    password: str
    role_id: int  # 1=Admin, 2=User

class RoleUpdate(BaseModel):
    role_id: int

# [新增] 建立分享連結的請求格式
class ShareLinkCreate(BaseModel):
    expires_in_minutes: int = 60       # 預設 60 分鐘後過期
    permission_type: str = "readonly"  # readonly 或 downloadable

# [新增] 回傳給前端的連結資訊
class ShareLinkOut(BaseModel):
    token: str
    expires_at: datetime
    permission_type: str
    full_url: str  # 我們會幫忙組合成完整的 http://... 網址方便複製
    
# [新增] 建立 API Token 的回傳 (包含明碼 Token，只顯示一次)
class ApiTokenOut(BaseModel):
    token_id: int
    raw_token: str  # 這是給使用者複製的明碼 (例如 sk_abc123...)
    created_at: datetime
    

# [新增] 匯出任務的狀態回傳
class ExportJobOut(BaseModel):
    job_id: int
    status: str
    created_at: datetime
    # 下載連結 (完成後才有)
    download_url: Optional[str] = None
    
# [新增] 建立留言的輸入格式
class CommentCreate(BaseModel):
    content: str
    target_info: Optional[str] = None # 選填 (例如: "01:30" 或 "rect:10,10,50,50")

# [新增] 顯示留言的輸出格式
class CommentOut(BaseModel):
    comment_id: int
    user_id: int
    content: str
    target_info: Optional[str] = None
    
    # 為了顯示方便，我們通常會想知道是誰留的言 (Email)
    user_email: Optional[str] = None 

    class Config:
        from_attributes = True
        
# [新增] 標籤的輸入 (貼標籤時只要給名字)
class TagCreate(BaseModel):
    tag_name: str

# [新增] 標籤的輸出 (顯示詳細資訊)
class TagOut(BaseModel):
    tag_id: int
    tag_name: str
    is_ai_suggested: bool

    class Config:
        from_attributes = True
        
# [新增] 建立分類的輸入
class CategoryCreate(BaseModel):
    category_name: str
    parent_category_id: Optional[int] = None # 如果不填，代表是頂層分類

# [新增] 分類的輸出
class CategoryOut(BaseModel):
    category_id: int
    category_name: str
    parent_category_id: Optional[int] = None

    class Config:
        from_attributes = True
        
# schemas.py (加在最下面)

# [新增] 影像處理的請求格式
class ImageProcessRequest(BaseModel):
    operation: str  # 例如: "grayscale", "rotate", "resize", "blur"
    params: Optional[dict] = {} # 額外參數，例如 {"angle": 90} 或 {"width": 800}
    
# [新增] 請求重設密碼 (輸入 Email)
class PasswordResetRequest(BaseModel):
    email: str

# [新增] 執行重設密碼 (輸入 Token + 新密碼)
class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str