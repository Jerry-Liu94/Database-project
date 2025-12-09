本專案為基於 FastAPI 的數位資產管理（DAM）後端服務，提供資產上傳、版本管理、標籤、分類、分享連結、MFA、API Token、稽核日誌與批次匯出等功能。前端可經由 REST API 或 Swagger UI 串接。

- 後端框架：FastAPI
- 入口檔：main.py（應用物件 `app`）
- 預設分支：main
- 主要語言：Python 37.2%｜JavaScript 26.3%｜CSS 20%｜HTML 16.3%｜Mako 0.2%

---

## 快速開始

1) 取得程式碼與建立環境
```bash
git clone https://github.com/Jerry-Liu94/Database-project.git
cd Database-project

python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 若倉庫內有 requirements.txt，建議優先使用：
pip install -r requirements.txt

# 若需要手動安裝依賴，可參考（依實際為準）：
pip install fastapi uvicorn sqlalchemy python-jose[cryptography] pillow transformers deep-translator pyotp qrcode minio python-multipart
```

2) 設定環境變數（.env 或系統環境）
```
# 服務外部可存取基底網址（用於產生下載/縮圖/重設密碼連結）
DOMAIN_HOST=http://localhost:8000

# MinIO 物件儲存（必要）
MINIO_ENDPOINT=127.0.0.1:9000
MINIO_ACCESS_KEY=<your_minio_access_key>
MINIO_SECRET_KEY=<your_minio_secret_key>
MINIO_BUCKET_NAME=<your_bucket_name>
# 啟用 presigned URL（選用）
MINIO_USE_PRESIGNED=false

# 寄信（密碼重設）設定（若用本機 postfix，可使用預設）
SMTP_HOST=127.0.0.1
SMTP_PORT=25
```

3) 準備外部服務
- MinIO：請確認 MINIO_ENDPOINT 可連線且指定的 BUCKET 已存在
- ffmpeg：若要支援影片截圖與縮圖，請安裝 ffmpeg（系統層）
- 資料庫：請依 `database.py` 設定（SQLAlchemy `SessionLocal`）準備資料庫與資料表（若有 migration，請先執行）

4) 啟動服務
```bash
# 開發模式（自動重載）
uvicorn main:app --reload --port 8000
# 服務啟動後：
# - API 根目錄：   http://localhost:8000/
# - Swagger UI：   http://localhost:8000/docs
# - ReDoc（可選）： http://localhost:8000/redoc
```

---

## 認證與授權

- 認證機制：
  - OAuth2 Password（/token 取得 JWT，於 Authorization: Bearer <token> 使用）
  - API Key（自 /users/me/api_tokens 產生，於 X-API-TOKEN:<key> 使用）
- 授權（權限與角色）：
  - 管理員 Admin：`role_id == 1`
  - 一般使用者 User：`role_id == 2`
  - 依賴函式 `require_permission(resource, action)` 控制資源操作（例如 asset:upload、asset:view）

---

## 主要環境變數與用途

- DOMAIN_HOST：用於產生公開連結（下載、縮圖、重設密碼頁面）
- MINIO_ENDPOINT / MINIO_ACCESS_KEY / MINIO_SECRET_KEY / MINIO_BUCKET_NAME：物件儲存設定
- MINIO_USE_PRESIGNED：是否為資產產生 presigned URL（true/false）
- SMTP_HOST / SMTP_PORT：寄送密碼重設郵件
- 其他資料庫連線設定請見 `database.py`（以 SQLAlchemy SessionLocal 管理）

---

## API 路由清單（摘自 main.py）

- 健康檢查
  - GET `/`：服務連線測試

- 認證與使用者
  - POST `/token`：使用帳號密碼（與可選 MFA）取得 JWT
  - GET `/users/`：列出使用者（回傳剝除敏感欄位）
  - GET `/users/me`：取得目前登入者資訊
  - GET `/users/me/mfa`：查詢目前登入者是否啟用 MFA
  - POST `/users/me/logout`：登出（寫入稽核日誌）
  - POST `/users/`：註冊新帳號（預設 `role_id=2`）

- API Token
  - POST `/users/me/api_tokens`：為自己建立 API Token（回傳 raw token 一次）
  - DELETE `/users/me/api_tokens/{token_id}`：撤銷自己的 API Token

- MFA（多因素認證）
  - GET `/users/me/mfa/generate`：產生 MFA secret 與 otpauth URI
  - POST `/users/me/mfa/verify`：驗證並啟用 MFA
  - GET `/users/me/mfa/qr-image`：直接回傳對應的 QR Code 圖片

- 資產（Assets）
  - POST `/assets/`：上傳單一資產（支援圖片縮圖與影片截圖，儲存於 MinIO）
  - GET `/assets/`：查詢資產（支援 filename、file_type、tag 篩選；非 Admin 只能看自己）
  - GET `/assets/{asset_id}`：讀取單一資產（含最新版本、上傳者、標籤、metadata）
  - PATCH `/assets/{asset_id}`：更新資產（檔名、覆寫標籤）
  - DELETE `/assets/{asset_id}`：刪除資產（含刪除 MinIO 物件與關聯記錄）
  - POST `/assets/{asset_id}/versions`：新增資產新版本（含縮圖與 metadata 更新）
  - GET `/assets/{asset_id}/download`：下載或串流（支援 Range 請求；權限檢查）
  - GET `/assets/{asset_id}/thumbnail`：取得縮圖（若無縮圖則回傳原檔內容）
  - POST `/assets/batch`：批次上傳多檔（逐檔處理，失敗不影響其餘檔案）

- 標籤（Tags）
  - POST `/assets/{asset_id}/tags`：為資產新增標籤（Find or Create）
  - GET `/assets/{asset_id}/tags`：讀取資產所有標籤
  - GET `/tags`：系統內所有標籤

- 分類（Categories）
  - POST `/categories/`：新增分類（支援 parent_category_id＝None 顶層）
  - GET `/categories/`：列出所有分類
  - POST `/assets/{asset_id}/categories?category_id={id}`：將資產加入分類
  - GET `/assets/{asset_id}/categories`：查詢資產所屬分類

- 分享（Shares）
  - POST `/assets/{asset_id}/share`：建立分享連結（設定權限與有效期）
  - GET `/share/{token}`：公開訪問分享連結（依權限 inline/attachment）

- 匯出（Exports）
  - POST `/export/`：建立匯出任務（背景產生 zip 與 manifest.json）
  - GET `/export/{job_id}`：查詢匯出任務狀態（完成時提供下載 URL）
  - GET `/export/{job_id}/download`：下載匯出檔案

- 稽核（Audit Logs）
  - GET `/admin/audit-logs`：列出稽核日誌（含 user_name）
  - GET `/admin/audit-logs/export`：匯出最近 180 天稽核日誌 CSV（僅 Admin）

- Admin 管理
  - POST `/admin/users/`：建立使用者（限制 role_id 為 1 或 2）
  - PATCH `/admin/users/{user_id}/role`：更新使用者角色（1/2）
  - DELETE `/admin/users/{user_id}`：刪除使用者並清除其資產與相關記錄

- 影像處理
  - POST `/assets/{asset_id}/process`：對圖片資產套用操作（如 grayscale、rotate），自動產生新版本

- 密碼重設
  - POST `/auth/password-reset/request`：請求重設（寄出含 raw token 的連結；DB 僅存 SHA-256 雜湊）
  - POST `/auth/password-reset/confirm`：提交 token 與新密碼完成重設
  - GET `/reset-password`：簡易重設密碼 HTML 頁（供點擊信件後操作）

---

## 使用流程示例

1) 登入取得 JWT
```bash
curl -X POST http://localhost:8000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=<email>&password=<password>&otp=<optional_mfa_code>"
# 回傳 { "access_token": "...", "token_type": "bearer" }
```

2) 以 JWT 呼叫受保護 API
```bash
curl http://localhost:8000/users/me -H "Authorization: Bearer <access_token>"
```

3) 產生 API Token 並以 X-API-TOKEN 呼叫
```bash
# 產生
curl -X POST http://localhost:8000/users/me/api_tokens -H "Authorization: Bearer <access_token>"
# 之後以 Header 帶入：
curl http://localhost:8000/assets/ -H "X-API-TOKEN: <raw_token>"
```

---

## 注意事項

- MinIO 連線與 Bucket：服務啟動時會即刻檢查 MinIO 相關環境變數是否完整，未設定將直接拋錯中止
- 影片縮圖：需系統已安裝 `ffmpeg`
- DOMAIN_HOST：務必設定為外部可存取的 HTTPS 網域於正式環境（供分享/下載/重設密碼連結）

---

## 專案結構（重點）

- main.py：FastAPI 應用（所有路由、CORS、權限、MFA、分享、匯出、稽核等）
- models.py / schemas.py / database.py：資料模型、Pydantic schema 與 DB 連線設定（請依實際檔案為準）
- 其餘前端資源與靜態檔（若有）位於專案目錄內
