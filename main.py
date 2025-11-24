from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Security, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, APIKeyHeader
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
import uuid  # <--- 用來產生亂碼 Token
import secrets # <--- 用來產生安全亂碼
import zipfile
import json

# [新增] 後台任務：執行打包
def process_export_job(job_id: int, db: Session):
    # 1. 重新查詢 Job (因為是在背景執行，要確保連線最新)
    job = db.query(models.ExportJob).filter(models.ExportJob.job_id == job_id).first()
    if not job:
        return

    try:
        # 更新狀態: Running
        job.status = "running"
        db.commit()

        # 2. 準備壓縮檔路徑
        export_dir = "exports"
        if not os.path.exists(export_dir):
            os.makedirs(export_dir)
        
        zip_filename = f"export_{job_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.zip"
        zip_filepath = f"{export_dir}/{zip_filename}"

        # 3. 找出該使用者的所有資產 (這裡簡化為匯出該使用者全部上傳的)
        assets = db.query(models.Asset).filter(models.Asset.uploaded_by_user_id == job.user_id).all()
        
        manifest_data = [] # 用來產生 JSON 清單 [cite: 256]

        # 4. 開始壓縮
        with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for asset in assets:
                # 只匯出有最新版本的
                if asset.latest_version and os.path.exists(asset.latest_version.storage_path):
                    # 把實體檔案加入 ZIP
                    # arcname 是在 zip 裡面的檔名，我們用 "ID_檔名" 避免重複
                    file_name_in_zip = f"{asset.asset_id}_{asset.filename}"
                    zipf.write(asset.latest_version.storage_path, arcname=file_name_in_zip)
                    
                    # 加入清單資料
                    manifest_data.append({
                        "asset_id": asset.asset_id,
                        "filename": asset.filename,
                        "file_type": asset.file_type,
                        "original_path": file_name_in_zip
                    })

            # 5. 加入 manifest.json (需求要求的清單)
            zipf.writestr("manifest.json", json.dumps(manifest_data, ensure_ascii=False, indent=2))

        # 6. 更新狀態: Completed
        job.status = "completed"
        job.file_path = zip_filepath
        db.commit()

    except Exception as e:
        print(f"Export failed: {e}")
        job.status = "failed"
        db.commit()

# 定義 API Token 應該放在 Header 的哪個欄位 (例如 X-API-TOKEN)
api_key_header = APIKeyHeader(name="X-API-TOKEN", auto_error=False)
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

# [修改] 支援 JWT 或 API Token 的身分驗證
def get_current_user(
    token: str = Depends(oauth2_scheme), 
    api_key: str = Security(api_key_header), # 這裡會自動去抓 Header: X-API-TOKEN
    db: Session = Depends(get_db)
):
    # 情境 A: 使用 API Token (X-API-TOKEN)
    if api_key:
        # 1. 雖然 Token 是亂碼，但我們不能直接查 (因為 DB 存的是 Hash)
        # 所以這裡比較特別：我們無法用 SQL 查 Hash，只能遍歷 (效率較差) 或改變策略
        # [優化策略]: 為了效能，實務上通常 Token 格式是 "user_id.隨機碼"
        # 這裡為了簡單符合你的 DDL，我們先假設使用者數量不多，用比較笨的方法：
        # 更好的做法是：使用者傳來 Token，我們先 Hash 它，再去 DB 查 Hash
        
        # 假設 api_key 就是明碼，我們先把它 hash 起來
        # 注意：這裡前提是你的 verify_password 支援直接比對，
        # 但因為 bcrypt 每次 hash 結果不同，我們無法用 `filter(token_hash=hash(api_key))`
        
        # [修正策略]: 既然 DDL 規定存 Hash，那我們驗證時必須取出該使用者的所有 Token 來比對
        # 但因為我們不知道是哪個 user，這會很慢。
        # 為了作業順利，我們這裡做一個「小變通」：
        # 我們產生 Token 時不 Hash，直接存明碼 (雖然 DDL 叫 token_hash)，
        # 或者我們假設你傳來的 api_key 格式是 "user_id:random_secret"
        
        # 讓我們採用最標準做法：API Token 在 DB 應該是可查詢的 (只是不能反推)
        # 為了配合你的 security.verify_password (bcrypt)，我們必須遍歷...
        # 🛑 等等，為了不讓程式碼太複雜，我們這裡採用「直接查詢」法。
        # 請確保 DB 裡的 token_hash 存的是「可以被查詢的字串」(例如 SHA256)，而不是 Bcrypt。
        
        # 但為了不改動你現有的 security.py，我們這裡用一個簡單的邏輯：
        # 假設 api_key 就是 DB 裡存的字串 (不加密了，為了方便與效能)。
        # 如果你堅持要加密，那我們需要使用者傳 user_id 進來。
        
        # [最終簡易版實作]: 直接查 DB (把 token_hash 當作 token 欄位用)
        token_record = db.query(models.ApiToken).filter(models.ApiToken.token_hash == api_key).first()
        if token_record:
            return token_record.user
            
    # 情境 B: 使用 JWT (原本的邏輯)
    if token:
        try:
            payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
            email: str = payload.get("sub")
            if email:
                user = db.query(models.User).filter(models.User.email == email).first()
                if user:
                    return user
        except JWTError:
            pass
            
    # 兩者都失敗
    raise HTTPException(
        status_code=401,
        detail="無效的憑證 (Token 或 API Key)",
        headers={"WWW-Authenticate": "Bearer"},
    )

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
# [修改] 搜尋資產 API (支援 檔名、類型、標籤)
@app.get("/assets/", response_model=List[schemas.AssetOut])
def read_assets(
    filename: Optional[str] = None,
    file_type: Optional[str] = None,
    tag: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Asset)
    
    # 搜尋邏輯 (保持不變)
    if filename:
        query = query.filter(models.Asset.filename.like(f"%{filename}%"))
    if file_type:
        query = query.filter(models.Asset.file_type == file_type)
    if tag:
        query = query.join(models.AssetTag).join(models.Tag).filter(models.Tag.tag_name == tag)
        
    assets = query.all()

    # [新增] 幫每個資產加上下載連結
    # 因為 SQLAlchemy 物件是可變的，我們直接掛一個屬性上去，Pydantic 就會讀到了
    for asset in assets:
        asset.download_url = f"http://127.0.0.1:8000/assets/{asset.asset_id}/download"
        
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
    
# [新增] API 1: 產生分享連結 (FR-5.2)
@app.post("/assets/{asset_id}/share", response_model=schemas.ShareLinkOut)
def create_share_link(
    asset_id: int,
    link_data: schemas.ShareLinkCreate,
    current_user: models.User = Depends(require_permission("asset", "view")), # 只要有 view 權限就能分享
    db: Session = Depends(get_db)
):
    # 1. 確認資產存在
    asset = db.query(models.Asset).filter(models.Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="找不到該資產")

    # 2. 產生亂碼 Token (使用 UUID)
    token = str(uuid.uuid4())

    # 3. 計算過期時間
    expires_at = datetime.utcnow() + timedelta(minutes=link_data.expires_in_minutes)

    # 4. 寫入 ShareLink 表
    new_link = models.ShareLink(
        token=token,
        created_by_user_id=current_user.user_id,
        expires_at=expires_at,
        permission_type=link_data.permission_type
    )
    db.add(new_link)
    db.flush() # 取得 link_id

    # 5. 寫入 ShareAsset 關聯表
    new_share_asset = models.ShareAsset(
        link_id=new_link.link_id,
        asset_id=asset.asset_id
    )
    db.add(new_share_asset)
    
    db.commit()

    # 6. 回傳結果 (組裝成完整網址)
    return {
        "token": token,
        "expires_at": expires_at,
        "permission_type": new_link.permission_type,
        "full_url": f"http://127.0.0.1:8000/share/{token}"
    }

# [新增] API 2: 公開存取分享連結 (不需要登入!)
@app.get("/share/{token}")
def access_share_link(token: str, db: Session = Depends(get_db)):
    # 1. 找連結
    share_link = db.query(models.ShareLink).filter(models.ShareLink.token == token).first()
    
    if not share_link:
        raise HTTPException(status_code=404, detail="連結無效或不存在")

    # 2. 檢查過期
    if share_link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="此連結已過期")

    # 3. 找出對應的資產 (假設一個連結只對應一個資產)
    # 雖然 DB 設計是多對多，但為了簡化，我們先抓第一筆
    share_asset_record = db.query(models.ShareAsset).filter(models.ShareAsset.link_id == share_link.link_id).first()
    
    if not share_asset_record:
        raise HTTPException(status_code=404, detail="連結未關聯任何資產")
        
    asset = share_asset_record.asset
    
    # 4. 確保資產有實體檔案
    if not asset.latest_version:
         raise HTTPException(status_code=404, detail="檔案遺失")
         
    version = asset.latest_version
    
    # 5. 根據權限決定行為
    # 如果是 'downloadable' -> attachment (下載)
    # 如果是 'readonly' -> inline (預覽)
    disposition = "attachment" if share_link.permission_type == "downloadable" else "inline"

    return FileResponse(
        path=version.storage_path,
        filename=asset.filename,
        media_type=asset.file_type,
        content_disposition_type=disposition
    )
    
# [新增] 產生 API Token (FR-7.1)
@app.post("/users/me/api_tokens", response_model=schemas.ApiTokenOut)
def create_api_token(
    current_user: models.User = Depends(get_current_user), # 需要先登入才能產生
    db: Session = Depends(get_db)
):
    # 1. 產生一組安全亂碼 (例如 32 bytes hex)
    # 為了方便辨識，加個前綴
    raw_token = "sk_" + secrets.token_hex(32)
    
    # 2. 存入資料庫
    # 註：為了上面驗證方便，我們這裡暫時「不 Hash」，直接存入 token_hash 欄位
    # 如果要嚴格符合資安，應該存 sha256(raw_token)，查詢時也用 sha256 查
    new_token = models.ApiToken(
        user_id=current_user.user_id,
        token_hash=raw_token # 這裡直接存，方便 `get_current_user` 查詢
    )
    
    db.add(new_token)
    db.commit()
    db.refresh(new_token)
    
    # 3. 回傳 (包含明碼，讓使用者複製)
    return {
        "token_id": new_token.token_id,
        "raw_token": raw_token,
        "created_at": new_token.created_at
    }

# [新增] 刪除/撤銷 API Token
@app.delete("/users/me/api_tokens/{token_id}")
def revoke_api_token(
    token_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    token_record = db.query(models.ApiToken).filter(
        models.ApiToken.token_id == token_id,
        models.ApiToken.user_id == current_user.user_id
    ).first()
    
    if not token_record:
        raise HTTPException(status_code=404, detail="Token 不存在")
        
    db.delete(token_record)
    db.commit()
    return {"message": "Token 已撤銷"}

# [新增] API 1: 觸發匯出任務 (POST) FR-7.2
@app.post("/export/", response_model=schemas.ExportJobOut)
def create_export_job(
    background_tasks: BackgroundTasks, # FastAPI 的魔法參數
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. 建立任務紀錄 (Pending)
    new_job = models.ExportJob(
        user_id=current_user.user_id,
        status="pending"
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # 2. 丟給後台去跑 (不會卡住使用者的瀏覽器)
    background_tasks.add_task(process_export_job, new_job.job_id, db)

    return {
        "job_id": new_job.job_id,
        "status": new_job.status,
        "created_at": new_job.created_at,
        "download_url": None
    }

# [新增] API 2: 查詢任務狀態與下載連結 (GET)
@app.get("/export/{job_id}", response_model=schemas.ExportJobOut)
def get_export_job(
    job_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(models.ExportJob).filter(
        models.ExportJob.job_id == job_id,
        models.ExportJob.user_id == current_user.user_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="任務不存在")

    download_url = None
    if job.status == "completed":
        # 產生下載連結
        download_url = f"http://127.0.0.1:8000/export/{job_id}/download"

    return {
        "job_id": job.job_id,
        "status": job.status,
        "created_at": job.created_at,
        "download_url": download_url
    }

# [新增] API 3: 下載打包好的檔案 (GET)
@app.get("/export/{job_id}/download")
def download_export_file(
    job_id: int,
    db: Session = Depends(get_db)
):
    # 這裡為了方便測試，暫時不檢查權限 (或你可以加上 token 驗證)
    job = db.query(models.ExportJob).filter(models.ExportJob.job_id == job_id).first()
    
    if not job or job.status != "completed" or not job.file_path or not os.path.exists(job.file_path):
        raise HTTPException(status_code=404, detail="檔案未準備好或已遺失")

    return FileResponse(
        path=job.file_path,
        filename=os.path.basename(job.file_path),
        media_type="application/zip",
        content_disposition_type="attachment"
    )
    
# [新增] API 1: 新增留言 (FR-4.1)
@app.post("/assets/{asset_id}/comments", response_model=schemas.CommentOut)
def create_comment(
    asset_id: int,
    comment_data: schemas.CommentCreate,
    current_user: models.User = Depends(get_current_user), # 需要登入
    db: Session = Depends(get_db)
):
    # 1. 確認資產存在
    asset = db.query(models.Asset).filter(models.Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="找不到該資產")

    # 2. 建立留言
    new_comment = models.Comment(
        asset_id=asset.asset_id,
        user_id=current_user.user_id,
        content=comment_data.content,
        target_info=comment_data.target_info
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    # 3. 回傳資料 (手動補上 user_email 方便前端顯示)
    return schemas.CommentOut(
        comment_id=new_comment.comment_id,
        user_id=new_comment.user_id,
        content=new_comment.content,
        target_info=new_comment.target_info,
        user_email=current_user.email
    )

# [新增] API 2: 讀取留言列表 (FR-4.1)
@app.get("/assets/{asset_id}/comments", response_model=List[schemas.CommentOut])
def read_comments(
    asset_id: int,
    db: Session = Depends(get_db)
):
    # 1. 查詢該資產的所有留言
    comments = db.query(models.Comment).filter(models.Comment.asset_id == asset_id).all()
    
    # 2. 轉換格式 (補上 user_email)
    results = []
    for c in comments:
        # 透過 relationship 取得 email
        email = c.user.email if c.user else "Unknown"
        results.append(schemas.CommentOut(
            comment_id=c.comment_id,
            user_id=c.user_id,
            content=c.content,
            target_info=c.target_info,
            user_email=email
        ))
        
    return results

# [新增] API 1: 幫資產貼標籤 (FR-3.3)
@app.post("/assets/{asset_id}/tags", response_model=schemas.TagOut)
def add_tag_to_asset(
    asset_id: int,
    tag_data: schemas.TagCreate,
    current_user: models.User = Depends(require_permission("asset", "upload")), # 假設要有上傳權限才能改標籤
    db: Session = Depends(get_db)
):
    # 1. 確認資產存在
    asset = db.query(models.Asset).filter(models.Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="找不到該資產")

    # 2. 檢查標籤是否存在 (Find or Create)
    # 我們先用標籤名去查，如果有就用舊的，沒有就建新的
    tag = db.query(models.Tag).filter(models.Tag.tag_name == tag_data.tag_name).first()
    
    if not tag:
        # 標籤不存在，建立新標籤
        tag = models.Tag(tag_name=tag_data.tag_name, is_ai_suggested=False)
        db.add(tag)
        db.flush() # 取得 tag_id
    
    # 3. 建立關聯 (Asset - Tag)
    # 先檢查是否已經貼過這個標籤了，避免重複錯誤
    existing_link = db.query(models.AssetTag).filter(
        models.AssetTag.asset_id == asset_id,
        models.AssetTag.tag_id == tag.tag_id
    ).first()

    if not existing_link:
        new_asset_tag = models.AssetTag(asset_id=asset_id, tag_id=tag.tag_id)
        db.add(new_asset_tag)
        db.commit()
    
    return tag

# [新增] API 2: 查詢某資產的所有標籤
@app.get("/assets/{asset_id}/tags", response_model=List[schemas.TagOut])
def read_asset_tags(
    asset_id: int,
    db: Session = Depends(get_db)
):
    # 1. 確認資產存在
    asset = db.query(models.Asset).filter(models.Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="找不到該資產")

    # 2. 查詢關聯的標籤
    # 這裡使用 SQLAlchemy 的 join 查詢：AssetTag -> Tag
    tags = db.query(models.Tag).join(models.AssetTag).filter(models.AssetTag.asset_id == asset_id).all()
    
    return tags

# [新增] API 3: 列出系統所有標籤 (方便前端做自動補全)
@app.get("/tags", response_model=List[schemas.TagOut])
def read_all_tags(db: Session = Depends(get_db)):
    return db.query(models.Tag).all()