/* js/login_action.js */
import { API_BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.signup-form-final');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const otpInput = document.getElementById('otp'); 
    const mfaGroup = document.getElementById('mfa-group');
    const loginBtn = document.querySelector('.login-button');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const username = usernameInput.value;
            const password = passwordInput.value;
            const otp = otpInput ? otpInput.value.trim() : "";

            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);
            
            if (mfaGroup.style.display !== 'none' && otp) {
                formData.append('otp', otp);
            }

            try {
                loginBtn.innerText = "登入中...";
                loginBtn.disabled = true;

                // 1. 執行登入，取得 Token
                const response = await fetch(`${API_BASE_URL}/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData
                });

                // --- 處理 MFA 403 ---
                if (response.status === 403) {
                    const errData = await response.json();
                    if (errData.detail === "MFA_REQUIRED") {
                        mfaGroup.style.display = 'block';
                        alert("您的帳號已啟用二階段驗證 (MFA)，請輸入 Google Authenticator 上的 6 位數代碼。");
                        loginBtn.innerText = "驗證並登入";
                        loginBtn.disabled = false;
                        otpInput.focus();
                        return; 
                    }
                }

                // --- 處理一般錯誤 ---
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.detail || "帳號或密碼錯誤");
                }

                const data = await response.json();
                
                // 2. 存 Token
                localStorage.setItem('redant_token', data.access_token);
                
                // 3. [新增] 判斷身分並分流導向
                // 因為後端登入 API 沒回傳 role_id，我們用 Token 再去查一次使用者資料
                try {
                    const userRes = await fetch(`${API_BASE_URL}/users/`, {
                        method: 'GET',
                        headers: { 
                            'Authorization': `Bearer ${data.access_token}` 
                        }
                    });

                    if (userRes.ok) {
                        const users = await userRes.json();
                        // 比對 Email 找到目前登入者
                        const me = users.find(u => u.email === username);
                        
                        // 判斷權限 (Role ID 1 = Admin)
                        if (me && me.role_id === 1) {
                            window.location.href = "user_management.html";
                        } else {
                            window.location.href = "index.html"; 
                        }
                    } else {
                        // 查不到資料，保險起見回首頁
                        window.location.href = "index.html";
                    }
                } catch (roleErr) {
                    console.error("無法取得角色資料，預設回首頁", roleErr);
                    window.location.href = "index.html";
                }

            } catch (error) {
                alert("登入失敗: " + error.message);
                if (error.message.includes("MFA")) {
                    otpInput.value = "";
                    otpInput.focus();
                }
                loginBtn.innerText = "登入";
                loginBtn.disabled = false;
            }
        });
    }
});

// 註冊按鈕邏輯 (維持不變)
document.addEventListener('DOMContentLoaded', () => {
    const registerBtn = document.querySelector('.register-button');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            window.location.href = "signup.html"; 
        });
    }
});