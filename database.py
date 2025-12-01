from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# [注意] 從環境變數讀取資料庫連線資訊，提高安全性
# 格式: mysql+pymysql://帳號:密碼@IP位址:Port/資料庫名稱
SQLALCHEMY_DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "mysql+pymysql://root:!Qazwsxedc7162@123.195.209.250:33060/redant"
)

# 安全性提醒：正式環境請務必設定環境變數
if not os.environ.get("DATABASE_URL"):
    print("⚠️ 警告: DATABASE_URL 未設定，使用預設值。正式環境請設定環境變數！")

# 建立引擎
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 建立 Session 工廠 (之後每個請求都會從這裡拿連線)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 建立模型基底類別
Base = declarative_base()

# 依賴注入函式 (給 API 用)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()