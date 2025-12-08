// js/login_action.js
import { API_BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.signup-form-final');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    // 新增抓取 MFA 相關元素
    const otpInput = document.getElementById('otp'); 
    const mfaGroup = document.getElementById('mfa-group');
    
    const loginBtn = document.querySelector('.login-button');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // 阻止表單重新整理

            const username = usernameInput.value;
            const password = passwordInput.value;
            // 取得 OTP 的值 (如果有的話)
            const otp = otpInput ? otpInput.value.trim() : "";

            // 準備資料 (FastAPI 要求 x-www-form-urlencoded)
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);
            
            // 如果 MFA 輸入框是顯示狀態，且有輸入值，就帶上 otp 參數
            if (mfaGroup.style.display !== 'none' && otp) {
                formData.append('otp', otp);
            }

            try {
                loginBtn.innerText = "登入中...";
                loginBtn.disabled = true;

                const response = await fetch(`${API_BASE_URL}/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData
                });

                // [新增] 針對 MFA 的特殊判斷
                if (response.status === 403) {
                    const errData = await response.json();
                    
                    // 對應 main.py 裡的 detail="MFA_REQUIRED"
                    if (errData.detail === "MFA_REQUIRED") {
                        // 1. 顯示 MFA 輸入框
                        mfaGroup.style.display = 'block';
                        
                        // 2. 提示使用者
                        alert("您的帳號已啟用二階段驗證 (MFA)，請輸入 Google Authenticator 上的 6 位數代碼。");
                        
                        // 3. 恢復按鈕狀態，讓使用者可以再次點擊
                        loginBtn.innerText = "驗證並登入";
                        loginBtn.disabled = false;
                        
                        // 4. 自動聚焦到 OTP 輸入框
                        otpInput.focus();
                        return; // 中斷函式，等待使用者再次送出
                    }
                }

                // 一般錯誤處理 (401 帳密錯誤, 400 驗證碼錯誤)
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.detail || "帳號或密碼錯誤");
                }

                const data = await response.json();
                
                // 1. 存 Token
                localStorage.setItem('redant_token', data.access_token);
                
                // 2. 跳轉到首頁
                window.location.href = "success.html";

            } catch (error) {
                alert("登入失敗: " + error.message);
                
                // 如果是驗證碼錯誤，清空輸入框方便重打
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


document.addEventListener('DOMContentLoaded', () => {
    
    // 1. 抓取註冊按鈕
    const registerBtn = document.querySelector('.register-button');

    // 2. 綁定點擊事件
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            // 跳轉到註冊頁面
            window.location.href = "signup.html"; 
        });
    }
});