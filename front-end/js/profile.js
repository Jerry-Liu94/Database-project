/* js/profile.js */
import { API_BASE_URL, api } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    api.checkLogin();
    loadUserProfile();
    setupEventListeners();

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
});

async function handleLogout() {
    try {
        // 1. 呼叫後端登出 (記錄日誌)
        // 使用 api.getHeaders() 可以同時支援 JWT 或 API Key 的登出請求
        await fetch(`${API_BASE_URL}/users/me/logout`, {
            method: "POST",
            headers: api.getHeaders() 
        });
    } catch (err) { 
        console.warn("登出 API 呼叫失敗，但仍執行本地登出", err); 
    }

    // 2. ★★★ 清除「所有」類型的 Token ★★★
    localStorage.removeItem("redant_token");   // 清除 JWT
    localStorage.removeItem("redant_api_key"); // 清除 API Token (關鍵！)

    alert("您已成功登出 👋");
    
    // 3. ★★★ 修改這裡：跳轉回登入頁面 ★★★
    window.location.href = "login.html"; 
}

async function loadUserProfile() {
    try {
        // 這樣無論是 JWT 還是 API Token (sk-xxx) 都能通
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            method: 'GET',
            headers: api.getHeaders()
        });
        
        if (!response.ok) throw new Error("無法讀取使用者資料");
        
        // 後端直接回傳 User 物件 (schemas.UserOut)
        const me = await response.json();

        if (me) {
            renderProfile(me);
        }

    } catch (error) {
        console.error(error);
        alert("載入個人資料失敗: " + error.message);
    }
}

function renderProfile(user) {
    const nameEl = document.querySelector('.user-name');
    const emailEl = document.querySelector('.user-email');
    if (nameEl) nameEl.innerText = user.user_name || "未設定";
    if (emailEl) emailEl.innerText = user.email;

    const titleEl = document.getElementById('user-title');
    if (titleEl) titleEl.innerText = user.role_name || "未設定";

    const roleEl = document.getElementById('user-role'); 
    if (roleEl) roleEl.innerText = user.role_id !== undefined ? user.role_id : "N/A";

    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        if (user.role_id === 1) logoLink.href = "user_management.html";
        else logoLink.href = "index.html";
    }

    const mfaToggle = document.getElementById('mfa-toggle');
    const mfaStatusText = document.getElementById('mfa-status-text');

    if (mfaToggle && user.mfa_enabled) {
        mfaToggle.checked = true;
        mfaToggle.disabled = true;
        if(mfaStatusText) mfaStatusText.style.display = "inline";
        mfaToggle.parentElement.classList.add('is-locked'); 
    } else {
        mfaToggle.checked = false;
        if(mfaStatusText) mfaStatusText.style.display = "none";
    }
}

function setupEventListeners() {
    // 1. MFA 開關 (維持不變)
    const mfaToggle = document.getElementById('mfa-toggle');
    if (mfaToggle) {
        mfaToggle.addEventListener('change', async (e) => {
            if (e.target.checked) {
                if (confirm("您確定要啟用多因素認證嗎？")) {
                    try {
                        const res = await fetch(`${API_BASE_URL}/users/me/mfa/generate`, {
                            method: 'GET',
                            headers: api.getHeaders()
                        });
                        if(!res.ok) throw new Error("無法產生 MFA 金鑰");
                        window.location.href = "mfa.html"; 
                    } catch (err) {
                        alert(err.message);
                        e.target.checked = false; 
                    }
                } else {
                    e.target.checked = false; 
                }
            }
        });
    }

    // 2. ★★★ 修改重點：API Token 產生邏輯 (高安全性版) ★★★
    const apiTokenSpan = document.querySelector('.api-token-display span');
    const copyIcon = document.querySelector('.copy-icon');
    
    // 預設顯示遮罩文字
    if (apiTokenSpan) {
        apiTokenSpan.innerText = "sk-xxxxxxxxxxxxxxxx";
        apiTokenSpan.style.color = "#999";
    }
    
    if (copyIcon) {
        copyIcon.style.cursor = "pointer";
        copyIcon.onclick = async () => {
            // 跳出嚴肅的警告
            const confirmMsg = "⚠️ 警告：基於資安考量，系統只會顯示一次 API Token。\n\n" +
                               "按下確定後，將會產生一組「新的 Token」，舊的將立即失效。\n" +
                               "請務必在產生後立即複製並自行保存。";

            if (!confirm(confirmMsg)) {
                return;
            }

            try {
                // 1. 呼叫後端產生新 Token
                const res = await fetch(`${API_BASE_URL}/users/me/api_tokens`, {
                    method: 'POST',
                    headers: api.getHeaders()
                });
                
                if(!res.ok) throw new Error("產生失敗");
                
                const data = await res.json();
                const newToken = data.raw_token; // 只有這次後端會回傳 raw_token
                
                // 2. 顯示在畫面上 (紅色高亮)
                if (apiTokenSpan) {
                    apiTokenSpan.innerText = newToken; 
                    apiTokenSpan.style.color = "#d93025"; 
                    apiTokenSpan.style.fontWeight = "bold";
                }

                // 3. 自動複製到剪貼簿
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(newToken);
                    alert("✅ 新 Token 已產生並複製！\n\n請立即貼到你的程式或筆記本中保存。\n離開此頁面後將無法再次查看。");
                } else {
                    prompt("Token 已產生，請手動複製保存：", newToken);
                }

            } catch (err) {
                alert(err.message);
            }
        };
    }
}