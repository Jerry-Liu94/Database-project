/* js/mfa.js */
import { API_BASE_URL, api } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // 檢查登入狀態
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
            const originalBtnText = confirmBtn.innerText; // 保存原始按鈕文字

            // 1. 先檢查輸入 (此時按鈕還是可以按的狀態)
            if (!code) {
                alert("請輸入 6 位數驗證碼");
                return; // 直接結束，不會觸發鎖定
            }

            // 2. (選用) 如果您想加入確認視窗，請放在這裡
            // if (!confirm("確定要綁定 MFA 嗎？")) {
            //     return; // 按取消，直接結束，按鈕不會鎖定
            // }

            // 3. 開始進行 API 呼叫，這時候才鎖定按鈕
            let isSuccess = false; // 用來標記是否成功
            
            try {
                confirmBtn.innerText = "驗證中...";
                confirmBtn.disabled = true; // 鎖定按鈕

                // 呼叫驗證 API
                const response = await fetch(`${API_BASE_URL}/users/me/mfa/verify?otp_code=${code}`, {
                    method: 'POST',
                    headers: api.getHeaders()
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || "驗證失敗");
                }

                // --- 成功 ---
                isSuccess = true; // 標記成功
                alert("🎉 MFA 驗證成功！帳號保護已啟用。");
                window.location.href = "profile.html";

            } catch (error) {
                // --- 失敗 ---
                console.error(error);
                alert("錯誤: " + error.message);
                
            } finally {
                // --- 收尾 ---
                // 只有在「沒有成功」的情況下才恢復按鈕
                // 如果成功了 (isSuccess === true)，就讓按鈕保持鎖定，避免使用者在跳轉前重複點擊
                if (!isSuccess) {
                    confirmBtn.innerText = originalBtnText; // 恢復文字 "確認綁定"
                    confirmBtn.disabled = false;            // 解鎖按鈕
                }
            }
        });
    }
});

// --- [新功能] 抓取後端產生的 QR Code 圖片 ---
async function loadQrcodeImage() {
    const imgElement = document.getElementById('qr-code-img');
    const loadingText = document.getElementById('qr-loading-text');

    // 如果頁面上找不到這元素就不執行，避免報錯
    if (!imgElement) return;

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