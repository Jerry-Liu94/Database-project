// 如果你有 config.js 就用 import，沒有的話直接用下面的 const
import { API_BASE_URL } from './config.js'; 

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-form');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email');
            const submitBtn = form.querySelector('button');
            const email = emailInput.value;

            // 鎖定按鈕避免重複點擊
            submitBtn.disabled = true;
            submitBtn.textContent = "發送中...";

            try {
                const response = await fetch(`${API_BASE_URL}/auth/password-reset/request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });

                const data = await response.json();

                // 為了資安，通常不管 Email 存不存在都會顯示成功訊息
                alert("系統已處理您的請求！\n如果此 Email 存在，您將會在幾分鐘內收到重設信件。");
                
                // 成功後跳轉回登入頁
                window.location.href = "login.html";

            } catch (error) {
                console.error(error);
                alert("連線錯誤，請稍後再試");
                submitBtn.disabled = false;
                submitBtn.textContent = "發送重設信";
            }
        });
    }
});