// js/login_action.js
import { API_BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.signup-form-final');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.querySelector('.login-button');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // 阻止表單重新整理

            const username = usernameInput.value;
            const password = passwordInput.value;

            // 準備資料 (FastAPI 要求 x-www-form-urlencoded)
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            try {
                loginBtn.innerText = "登入中...";
                loginBtn.disabled = true;

                const response = await fetch(`${API_BASE_URL}/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error("帳號或密碼錯誤");
                }

                const data = await response.json();
                
                // 1. 存 Token
                localStorage.setItem('redant_token', data.access_token);
                
                // 2. 跳轉到首頁
                alert("登入成功！");
                window.location.href = "success.html";

            } catch (error) {
                alert("登入失敗: " + error.message);
                loginBtn.innerText = "登入";
                loginBtn.disabled = false;
            }
        });
    }
});