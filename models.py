# models.py
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, BigInteger, TIMESTAMP, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# 1. 新增: 權限表 (Permission)
class Permission(Base):
    __tablename__ = "permission"
    permission_id = Column(Integer, primary_key=True, index=True)
    resource = Column(String(100), nullable=False) # 例如 "asset"
    action = Column(String(50), nullable=False)    # 例如 "upload"

# 2. 新增: 角色權限關聯表 (Role_Permission)
class RolePermission(Base):
    __tablename__ = "role_permission"
    role_id = Column(Integer, ForeignKey("role.role_id"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permission.permission_id"), primary_key=True)

# 3. 角色 (Role) [cite: 43]
class Role(Base):
    __tablename__ = "role"
    role_id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False)
    
    users = relationship("User", back_populates="role")
    
    # [新增] 建立多對多關聯，讓 Role 可以直接存取 Permission
    permissions = relationship("Permission", secondary="role_permission", backref="roles")

# 4. 使用者 (User) [cite: 48]
class User(Base):
    __tablename__ = "user"
    user_id = Column(BigInteger, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    mfa_secret = Column(String(255), nullable=True)
    role_id = Column(Integer, ForeignKey("role.role_id"), nullable=False)

    role = relationship("Role", back_populates="users")
    assets_uploaded = relationship("Asset", back_populates="uploader")

# 5. 資產 (Asset) [cite: 81]
# 注意：這裡有循環參照，latest_version_id 指向 Version 表
class Asset(Base):
    __tablename__ = "asset"
    asset_id = Column(BigInteger, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50))
    # 這裡使用字串 'version.version_id' 來解決循環依賴定義問題
    latest_version_id = Column(BigInteger, ForeignKey("version.version_id"), nullable=True)
    uploaded_by_user_id = Column(BigInteger, ForeignKey("user.user_id"), nullable=False)

    uploader = relationship("User", back_populates="assets_uploaded")
    
    # 這裡定義與 Version 的關係
    versions = relationship("Version", back_populates="asset", foreign_keys="Version.asset_id")
    
    # 指向最新版本的關聯 (使用 remote_side 解決循環)
    latest_version = relationship("Version", foreign_keys=[latest_version_id], post_update=True)

# 6. 版本 (Version) [cite: 93]
class Version(Base):
    __tablename__ = "version"
    version_id = Column(BigInteger, primary_key=True, index=True)
    asset_id = Column(BigInteger, ForeignKey("asset.asset_id"), nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    storage_path = Column(String(1024), nullable=False) # 這裡存 NoSQL/S3 路徑
    created_at = Column(TIMESTAMP, server_default=func.now())

    asset = relationship("Asset", back_populates="versions", foreign_keys=[asset_id])

# 7. 元數據 (Metadata) [cite: 107]
class Metadata(Base):
    __tablename__ = "metadata"
    asset_id = Column(BigInteger, ForeignKey("asset.asset_id"), primary_key=True)
    filesize = Column(BigInteger)
    resolution = Column(String(50))
    duration = Column(String(50)) # 若是影片才有
    encoding_format = Column(String(50))

    # Metadata 與 Asset 是 1 對 1 關係
    asset_info = relationship("Asset", backref="metadata_info")
    
# 8. 稽核日誌 (Audit Log)
class AuditLog(Base):
    __tablename__ = "audit_log"
    log_id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("user.user_id"), nullable=True)
    asset_id = Column(BigInteger, ForeignKey("asset.asset_id"), nullable=True)
    action_type = Column(String(100), nullable=False) # 例如: "UPLOAD", "DOWNLOAD", "DELETE"
    action_timestamp = Column(TIMESTAMP, server_default=func.now())
    is_tampered = Column(Boolean, default=False)
    
# models.py (加在最下面)

# 9. 分享連結主表 (Share Link)
class ShareLink(Base):
    __tablename__ = "share_link"
    link_id = Column(BigInteger, primary_key=True, index=True)
    token = Column(String(100), unique=True, nullable=False, index=True)
    created_by_user_id = Column(BigInteger, ForeignKey("user.user_id"), nullable=False)
    expires_at = Column(TIMESTAMP, nullable=True)
    permission_type = Column(String(50), nullable=False) # 'readonly' 或 'downloadable'

    # 關聯
    shared_assets = relationship("ShareAsset", back_populates="link")

# 10. 分享連結與資產關聯表 (Share Asset - Many to Many)
class ShareAsset(Base):
    __tablename__ = "share_asset"
    link_id = Column(BigInteger, ForeignKey("share_link.link_id"), primary_key=True)
    asset_id = Column(BigInteger, ForeignKey("asset.asset_id"), primary_key=True)

    link = relationship("ShareLink", back_populates="shared_assets")
    asset = relationship("Asset")

