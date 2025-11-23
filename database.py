from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# [注意] 請將下方資訊改成你伺服器的實際帳密與 IP
# 格式: mysql+pymysql://帳號:密碼@IP位址:Port/資料庫名稱
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:!Qazwsxedc7162@123.195.209.250:33060/redant"

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