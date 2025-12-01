import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context
from dotenv import load_dotenv

# 1. 加入當前目錄到 sys.path，這樣才找得到 models 和 database
sys.path.append(os.getcwd())

# 2. 載入 .env 環境變數
load_dotenv()

# 3. 匯入你的 Base (讓 Alembic 知道資料表長怎樣)
from models import Base
# 這裡如果有用到其他 models 但沒在 models.py 匯入，也要在這邊 import 進來

# Alembic Config 物件
config = context.config

# 設定 Log
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 4. 設定 target_metadata
target_metadata = Base.metadata

# 5. [關鍵] 用 .env 覆蓋 alembic.ini 裡的 sqlalchemy.url
# 這樣就不用把密碼寫死在 ini 檔裡了
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise ValueError("DATABASE_URL not found in .env")
config.set_main_option("sqlalchemy.url", db_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # 建立 Engine
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()