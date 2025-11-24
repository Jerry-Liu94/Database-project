from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas
import shutil      # <--- 處理檔案複製
import os          # <--- 處理路徑
from datetime import datetime, timedelta  # <--- 記得加上逗號和 timedelta
from jose import JWTError, jwt
import security # 匯入寫的 security.py
from PIL import Image  # <--- 新增這個，用來處理圖片

app = FastAPI(title="RedAnt DAM System API")

# 告訴 FastAPI，如果要驗證身分，請去呼叫 "/token" 這個 API
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.get("/")
def read_root():
    return {"message": "RedAnt 系統連線成功！"}

# 使用 response_model=List[schemas.UserOut] 來過濾密碼
@app.get("/users/", response_model=List[schemas.UserOut])
def read_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return users

# 放在 get_db 後面，API 之前
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 解開 Token
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # 去資料庫查這個人還在不在
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# [新增] 權限檢查依賴 (Dependency)
def require_permission(resource: str, action: str):
    def permission_checker(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
        # 1. 查詢該使用者角色的所有權限
        # 透過 SQLAlchemy 的關聯，我們可以直接用 current_user.role.permissions
        user_permissions = current_user.role.permissions
        
        # 2. 檢查是否擁有目標權限
        has_perm = False
        for perm in user_permissions:
            if perm.resource == resource and perm.action == action:
                has_perm = True
                break
        
        # 3. 如果沒有權限，直接丟出 403 Forbidden 錯誤
        if not has_perm:
            raise HTTPException(
                status_code=403, 
                detail=f"權限不足：您需要 {resource}:{action} 權限才能執行此操作"
            )
        
        return current_user
    return permission_checker

# [重點] 使用 response_model=List[schemas.AssetOut] 來豐富資料
@app.post("/assets/", response_model=schemas.AssetOut)
def create_asset(
    file: UploadFile = File(...),        # 接收檔案
    # user_id: int = Form(...),            # 模擬：因為還沒做登入，先手動填上傳者ID
    current_user: models.User = Depends(require_permission("asset", "upload")), # <-- 加上這行！自動抓登入者
    db: Session = Depends(get_db)
):
    # 1. [模擬 NoSQL] 處理檔案儲存
    upload_dir = "uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    
    # 產生唯一的檔名 (避免檔名重複覆蓋)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    file_location = f"{upload_dir}/{timestamp}_{file.filename}"
    
    # 寫入硬碟
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 取得檔案大小 (給 Metadata 用)
    file_size = os.path.getsize(file_location)
    
    # =========== [新增] 自動解析圖片解析度 ===========
    resolution = "Unknown" # 預設值
    
    # 判斷是否為圖片 (根據 content_type)
    if file.content_type and file.content_type.startswith("image/"):
        try:
            with Image.open(file_location) as img:
                width, height = img.size
                resolution = f"{width}x{height}" # 格式: 1920x1080
        except Exception:
            print("圖片解析失敗，維持 Unknown")
    # ===============================================

    # 2. [SQL 資料庫操作] 開始寫入
    try:
        # 步驟 A: 建立 Asset (latest_version_id 先留空)
        # 對應文件 [cite: 85]：latest_version_id 稍後加入
        new_asset = models.Asset(
            filename=file.filename,
            file_type=file.content_type,
            uploaded_by_user_id=current_user.user_id,  # <--- 改成 current_user.user_id
            latest_version_id=None 
        )
        db.add(new_asset)
        db.flush()  # 重要！先暫存到資料庫，這樣 new_asset.asset_id 才會有值

        # 步驟 B: 建立 Version
        # 對應文件 [cite: 93-97]：version 需要 asset_id, storage_path
        new_version = models.Version(
            asset_id=new_asset.asset_id,  # 拿到剛剛產生的 ID
            version_number=1,
            storage_path=file_location    # 這裡存剛剛寫入硬碟的路徑
        )
        db.add(new_version)
        db.flush()  # 再次暫存，取得 new_version.version_id

        # 步驟 C: 建立 Metadata (基本資料)
        # 對應文件 [cite: 107-109]
        new_metadata = models.Metadata(
            asset_id=new_asset.asset_id,
            filesize=file_size,
            resolution=resolution,      # 圖片解析需要額外 library，先填 Unknown
            encoding_format=file.content_type.split("/")[-1] if file.content_type else "bin"
        )
        db.add(new_metadata)

        # 步驟 D: 回頭更新 Asset 的 latest_version_id
        new_asset.latest_version_id = new_version.version_id
        
        # =========== [新增] 步驟 E: 寫入稽核日誌 (Audit Log) ===========
        new_log = models.AuditLog(
            user_id=current_user.user_id,
            asset_id=new_asset.asset_id,
            action_type="UPLOAD",  # 記錄動作類型
            # action_timestamp 會由資料庫自動填入當前時間
        )
        db.add(new_log)
        # ============================================================
        
        # 最後確認並送出
        db.commit()
        db.refresh(new_asset)
        return new_asset

    except Exception as e:
        # 如果中間出錯 (例如硬碟滿了)，撤銷所有資料庫變更
        db.rollback()
        # 也要記得把剛剛存的檔案刪掉，避免變成垃圾檔案
        if os.path.exists(file_location):
            os.remove(file_location)
        raise HTTPException(status_code=500, detail=f"上傳失敗: {str(e)}")
    
@app.get("/assets/{asset_id}/download")
def download_asset(asset_id: int, db: Session = Depends(get_db)):
    # 1. 查詢資產
    asset = db.query(models.Asset).filter(models.Asset.asset_id == asset_id).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="找不到該資產")
        
    if not asset.latest_version_id:
        raise HTTPException(status_code=404, detail="該資產沒有任何版本檔案")

    # 2. 查詢該資產的最新版本資訊 (為了拿路徑)
    # 雖然我們可以用 asset.latest_version 直接拿，但為了保險起見，我們從 Version 表查
    version = db.query(models.Version).filter(models.Version.version_id == asset.latest_version_id).first()
    
    if not version or not os.path.exists(version.storage_path):
        raise HTTPException(status_code=404, detail="實體檔案遺失 (可能已被刪除)")

    # 3. 回傳檔案 (讓瀏覽器可以下載或預覽)
    return FileResponse(
        path=version.storage_path, 
        filename=asset.filename, # 下載時預設的檔名
        media_type=asset.file_type, # 告訴瀏覽器這是圖片還是影片
        content_disposition_type="inline"
    )
    

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. 找使用者
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # 2. 驗證密碼 (使用 security.py 的功能)
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="帳號或密碼錯誤",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. 發放 Token
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# [修改] 搜尋資產 API (對應 FR-3.1)
# 支援網址參數: ?filename=xxx&file_type=yyy
@app.get("/assets/", response_model=List[schemas.AssetOut])
def read_assets(
    filename: Optional[str] = None,   # 搜尋關鍵字
    file_type: Optional[str] = None,  # 篩選檔案類型
    db: Session = Depends(get_db)
):
    # 1. 建立基礎查詢 (SELECT * FROM asset)
    query = db.query(models.Asset)
    
    # 2. 如果有給檔名，就用模糊搜尋 (SQL: LIKE %name%)
    if filename:
        query = query.filter(models.Asset.filename.like(f"%{filename}%"))
        
    # 3. 如果有給類型，就精確搜尋 (SQL: WHERE file_type = '...')
    if file_type:
        query = query.filter(models.Asset.file_type == file_type)
        
    # 4. 執行查詢並回傳
    assets = query.all()
    return assets

# [新增] 註冊新帳號 API (對應 FR-1.1)
@app.post("/users/", response_model=schemas.UserOut)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. 檢查 Email 是否已被註冊
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email 已被註冊")
    
    # 2. 密碼加密 (使用 security.py 的功能)
    hashed_password = security.get_password_hash(user.password)
    
    # 3. 建立使用者 (預設角色為 3 = Viewer)
    # 注意：這裡我們寫死 role_id=3，避免一般人註冊變成 Admin
    new_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        role_id=3  # 預設 Viewer
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# main.py (加在最下面)

# [新增] 上傳新版本 API (對應 FR-4.2 資產版本控管)
@app.post("/assets/{asset_id}/versions", response_model=schemas.AssetOut)
def create_asset_version(
    asset_id: int,
    file: UploadFile = File(...),
    # 權限檢查: 必須要有 "upload" 權限才能更新版本
    current_user: models.User = Depends(require_permission("asset", "upload")),
    db: Session = Depends(get_db)
):
    # 1. 檢查資產是否存在
    asset = db.query(models.Asset).filter(models.Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="找不到該資產")

    # 2. 處理檔案儲存 (模擬 NoSQL/S3)
    upload_dir = "uploads"
    # 為了不覆蓋舊檔，我們在檔名加上時間戳記
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    file_location = f"{upload_dir}/{timestamp}_vNew_{file.filename}"
    
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 取得新檔案大小
    file_size = os.path.getsize(file_location)
    
    # (選擇性) 解析新圖片解析度 (複製之前的 Pillow 邏輯)
    resolution = "Unknown"
    if file.content_type and file.content_type.startswith("image/"):
        try:
            with Image.open(file_location) as img:
                resolution = f"{img.size[0]}x{img.size[1]}"
        except Exception:
            pass

    try:
        # 3. 計算新版號 (找出目前最新版號 + 1)
        # 如果 latest_version 是 None (理論上不該發生)，就從 0 開始
        current_version_num = asset.latest_version.version_number if asset.latest_version else 0
        new_version_num = current_version_num + 1

        # 4. 建立新 Version 記錄
        new_version = models.Version(
            asset_id=asset.asset_id,
            version_number=new_version_num,
            storage_path=file_location
        )
        db.add(new_version)
        db.flush() # 先執行以取得 new_version.version_id

        # 5. [關鍵] 更新 Asset 的 latest_version_id 指向新版本
        asset.latest_version_id = new_version.version_id
        
        # 6. 更新 Metadata (因為 Metadata 是跟著 Asset 的最新狀態)
        if asset.metadata_info:
             asset.metadata_info.filesize = file_size
             asset.metadata_info.resolution = resolution
             asset.metadata_info.encoding_format = file.content_type.split("/")[-1] if file.content_type else "bin"
        
        # 7. 寫入稽核日誌 (Audit Log)
        new_log = models.AuditLog(
            user_id=current_user.user_id,
            asset_id=asset.asset_id,
            action_type=f"UPDATE_VERSION_v{new_version_num}" # 記錄變成了 v2, v3...
        )
        db.add(new_log)

        db.commit()
        db.refresh(asset)
        return asset

    except Exception as e:
        db.rollback()
        # 出錯時記得刪除剛剛存的實體檔案，避免變成垃圾
        if os.path.exists(file_location):
            os.remove(file_location)
        raise HTTPException(status_code=500, detail=f"版本更新失敗: {str(e)}")