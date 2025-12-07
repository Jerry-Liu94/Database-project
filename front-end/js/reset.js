import { API_BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.querySelector('.signup-form-final');
    
    // 從網址取得 Token (例如 reset.html?token=xxxxx)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        alert("無效的重設連結 (缺少 Token)");
    }

    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const p1 = document.getElementById('new-password').value;
            const p2 = document.getElementById('confirm-password').value;

            if (p1 !== p2) {
                alert("兩次密碼不一致！");
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/auth/password-reset/confirm`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: token,
                        new_password: p1
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || "重設失敗");
                }

                alert("密碼重設成功！請重新登入。");
                window.location.href = "login.html";

            } catch (error) {
                alert(error.message);
            }
        });
    }
});