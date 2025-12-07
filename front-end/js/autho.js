/* js/autho.js */
import { API_BASE_URL, api } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. 檢查是否登入 (MFA 綁定通常是在登入後進行的設定)
    api.checkLogin();

    const form = document.querySelector('.signup-form-final');
    const input = document.getElementById('auth-key'); // 輸入框
    const confirmBtn = document.querySelector('.confirm-button-final');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const code = input.value.trim();

            if (!code) {
                alert("請輸入驗證碼");
                return;
            }

            try {
                confirmBtn.innerText = "驗證中...";
                confirmBtn.disabled = true;

                // 呼叫後端驗證 API
                // 注意：根據 main.py，otp_code 是 Query Parameter
                const response = await fetch(`${API_BASE_URL}/users/me/mfa/verify?otp_code=${code}`, {
                    method: 'POST',
                    headers: api.getHeaders()
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || "驗證失敗，請確認代碼是否正確");
                }

                alert("🎉 驗證成功！MFA 已正式啟用。");
                
                // 驗證成功後，通常導回個人檔案頁面或首頁
                window.location.href = "profile.html";

            } catch (error) {
                alert("錯誤: " + error.message);
                confirmBtn.innerText = "確認";
                confirmBtn.disabled = false;
            }
        });
    }
});