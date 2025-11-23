# reset_password.py
from security import get_password_hash, verify_password

# 1. 設定我們要的密碼
my_password = "admin123"

# 2. 產生真正適合你電腦的 Hash
new_hash = get_password_hash(my_password)

print("------ 請複製下方的 Hash 字串 ------")
print(new_hash)
print("------------------------------------")

# 3. 自我驗證測試 (確認這組 Hash 真的能用)
is_valid = verify_password(my_password, new_hash)
print(f"自我驗證測試: {is_valid}") 
# 如果這裡是 True，代表這組 Hash 絕對沒問題