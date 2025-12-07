import { API_BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.querySelector('.signup-form-final');
    const submitBtn = document.querySelector('.confirm-button-final');

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // 準備 JSON 資料
            const payload = {
                user_name: username,
                email: email,
                password: password
            };

            try {
                submitBtn.innerText = "註冊中...";
                submitBtn.disabled = true;

                const response = await fetch(`${API_BASE_URL}/users/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.detail || "註冊失敗");
                }

                alert("🎉 註冊成功！請使用新帳號登入。");
                window.location.href = "success.html?msg=註冊成功！請登入&target=login.html";

            } catch (error) {
                alert("錯誤: " + error.message);
                submitBtn.innerText = "確認";
                submitBtn.disabled = false;
            }
        });
    }
});