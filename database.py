import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

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