# init_db.py
from database import SessionLocal, engine
import models
import security

# 1. 確保所有資料表都已建立
models.Base.metadata.create_all(bind=engine)

def init_db():
    db = SessionLocal()
    try:
        print("🔄 開始初始化資料庫...")

        # --- 步驟 1: 建立角色 (Role) ---
        # 定義系統的三種角色
        roles = [
            models.Role(role_id=1, role_name="Admin"),
            models.Role(role_id=2, role_name="Editor"),
            models.Role(role_id=3, role_name="Viewer"),
        ]
        for r in roles:
            existing = db.query(models.Role).filter_by(role_id=r.role_id).first()
            if not existing:
                db.add(r)
                print(f"   ✅ 建立角色: {r.role_name}")

        db.flush() # 先寫入以確保後面找得到 ID

        # --- 步驟 2: 建立權限 (Permission) ---
        # 定義系統的權限
        perms = [
            models.Permission(permission_id=1, resource="asset", action="upload"),
            models.Permission(permission_id=2, resource="asset", action="view"),
            models.Permission(permission_id=3, resource="asset", action="delete"),
        ]
        for p in perms:
            existing = db.query(models.Permission).filter_by(permission_id=p.permission_id).first()
            if not existing:
                db.add(p)
                print(f"   ✅ 建立權限: {p.resource}:{p.action}")

        db.flush()

        # --- 步驟 3: 設定 角色-權限 關聯 (RolePermission) ---
        # 定義誰可以做什麼
        # 1. Admin (ID 1) -> 擁有全部權限 (1, 2, 3)
        # 2. Viewer (ID 3) -> 只有查看權限 (2)
        role_permissions = [
            models.RolePermission(role_id=1, permission_id=1), # Admin 可以 Upload
            models.RolePermission(role_id=1, permission_id=2), # Admin 可以 View
            models.RolePermission(role_id=1, permission_id=3), # Admin 可以 Delete
            models.RolePermission(role_id=3, permission_id=2), # Viewer 可以 View
        ]

        for rp in role_permissions:
            existing = db.query(models.RolePermission).filter_by(
                role_id=rp.role_id, permission_id=rp.permission_id
            ).first()
            if not existing:
                db.add(rp)
                print(f"   🔗 綁定權限: Role {rp.role_id} -> Perm {rp.permission_id}")

        # --- 步驟 4: 建立預設管理員 (Super User) ---
        admin_email = "admin@example.com"
        existing_user = db.query(models.User).filter_by(email=admin_email).first()
        
        if not existing_user:
            admin_user = models.User(
                email=admin_email,
                user_name="Super Admin",
                password_hash=security.get_password_hash("admin123"), # 預設密碼
                role_id=1 # 設定為 Admin 角色
            )
            db.add(admin_user)
            print(f"   👤 建立管理員帳號: {admin_email} / admin123")
        else:
            print(f"   ℹ️ 管理員帳號已存在")

        db.commit()
        print("🎉 資料庫初始化完成！")

    except Exception as e:
        print(f"❌ 初始化失敗: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()