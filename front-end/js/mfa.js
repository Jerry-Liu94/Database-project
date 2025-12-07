/* js/mfa.js */
import { API_BASE_URL, api } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. 確保使用者已登入 (因為這是綁定過程)
    api.checkLogin();

    const confirmBtn = document.querySelector('.confirm-button-final');
    const inputField = document.querySelector('.mfa-input');

    if (confirmBtn && inputField) {
        confirmBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // 防止可能的表單提交

            // 取得輸入值並去除空白
            const code = inputField.value.trim();

            if (!code) {
                alert("請輸入 6 位數驗證碼");
                return;
            }

            try {
                // UI 狀態更新
                confirmBtn.innerText = "驗證中...";
                confirmBtn.disabled = true;

                // 2. 呼叫後端 API
                // 注意：根據後端邏輯，otp_code 是 Query Parameter
                const response = await fetch(`${API_BASE_URL}/users/me/mfa/verify?otp_code=${code}`, {
                    method: 'POST',
                    headers: api.getHeaders()
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || "驗證失敗，請確認代碼是否正確");
                }

                // 3. 成功處理
                alert("🎉 MFA 驗證成功！帳號保護已啟用。");
                
                // 驗證成功後，通常跳轉回個人檔案頁面或首頁
                window.location.href = "profile.html";

            } catch (error) {
                console.error(error);
                alert("錯誤: " + error.message);
                
                // 恢復按鈕狀態
                confirmBtn.innerText = "確認";
                confirmBtn.disabled = false;
            }
        });
    }
});