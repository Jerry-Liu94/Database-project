/* js/mfa.js */
import { API_BASE_URL, api } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    api.checkLogin();

    // --- 新增：載入 QR Code 圖片 ---
    loadQrcodeImage();

    // 綁定確認按鈕 (驗證邏輯)
    const confirmBtn = document.querySelector('.confirm-button-final');
    const inputField = document.querySelector('.mfa-input');

    if (confirmBtn && inputField) {
        confirmBtn.addEventListener('click', async (e) => {
            e.preventDefault(); 
            const code = inputField.value.trim();

            if (!code) {
                alert("請輸入 6 位數驗證碼");
                return;
            }

            try {
                confirmBtn.innerText = "驗證中...";
                confirmBtn.disabled = true;

                // 呼叫驗證 API
                const response = await fetch(`${API_BASE_URL}/users/me/mfa/verify?otp_code=${code}`, {
                    method: 'POST',
                    headers: api.getHeaders()
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || "驗證失敗");
                }

                alert("🎉 MFA 驗證成功！帳號保護已啟用。");
                window.location.href = "profile.html";

            } catch (error) {
                console.error(error);
                alert("錯誤: " + error.message);
                confirmBtn.innerText = "確認綁定";
                confirmBtn.disabled = false;
            }
        });
    }
});

// --- [新功能] 抓取後端產生的 QR Code 圖片 ---
async function loadQrcodeImage() {
    const imgElement = document.getElementById('qr-code-img');
    const loadingText = document.getElementById('qr-loading-text');

    try {
        // 使用 fetch 才能帶入 Authorization Header
        const response = await fetch(`${API_BASE_URL}/users/me/mfa/qr-image`, {
            method: 'GET',
            headers: api.getHeaders() // 重要：一定要帶 Token
        });

        if (!response.ok) {
            throw new Error("無法讀取 QR Code");
        }

        // 把回傳的圖片資料轉成 Blob (二進位物件)
        const blob = await response.blob();
        
        // 建立一個臨時的 URL 指向這個 Blob
        const imgUrl = URL.createObjectURL(blob);

        // 設定給 img 標籤
        imgElement.src = imgUrl;
        imgElement.style.display = 'block'; // 顯示圖片
        if(loadingText) loadingText.style.display = 'none'; // 隱藏載入文字

    } catch (error) {
        console.error("QR Code Error:", error);
        if(loadingText) {
            loadingText.innerText = "QR Code 載入失敗，請重新產生";
            loadingText.style.color = "red";
        }
    }
}