/* js/autho.js */
import { API_BASE_URL, api } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // 這裡不用 checkLogin，因為這裡就是登入頁面

    const form = document.querySelector('.signup-form-final');
    const input = document.getElementById('auth-key'); 
    const confirmBtn = document.querySelector('.confirm-button-final');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const token = input.value.trim();

            if (!token) {
                alert("請輸入 Token");
                return;
            }

            try {
                confirmBtn.innerText = "驗證中...";
                confirmBtn.disabled = true;

                // 1. 嘗試用這個 Token 呼叫後端 API (例如查詢個人資料)
                // 注意：這裡我們手動帶入 X-API-TOKEN header
                const response = await fetch(`${API_BASE_URL}/users/me/mfa`, { // 借用一個簡單的 API 來測
                    method: 'GET',
                    headers: {
                        'X-API-TOKEN': token
                    }
                });

                if (!response.ok) {
                    throw new Error("無效的 Token");
                }

                // 2. 驗證成功！
                // 我們有兩種選擇：
                // A. 把它當作一般登入 Token 存起來 (這樣之後的 api.getHeaders 都要改寫支援 API Token)
                // B. 或者，為了簡單起見，我們這裡只做「跳轉示範」，因為 API Token 通常是用在後端腳本的
                
                // 這裡示範 A 方案的變形：存入 localStorage，但需要修改 config.js 才能全站通用
                // 為了不改壞現有的 JWT 機制，我們先用一個簡單的 alert 證明登入成功，然後跳轉
                
                // 若要全站通用，建議存入另一個 key，並在 config.js 裡優先讀取
                localStorage.setItem('redant_api_key', token); 
                
                alert("🎉 Token 驗證成功！\n(已儲存為 API Key)");
                window.location.href = "index.html";

            } catch (error) {
                alert("錯誤: " + error.message);
                confirmBtn.innerText = "確認";
                confirmBtn.disabled = false;
            }
        });
    }
});