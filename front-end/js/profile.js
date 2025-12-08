/* js/profile.js */
import { API_BASE_URL, api } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. 檢查登入狀態
    api.checkLogin();
    
    const token = localStorage.getItem("redant_token");
    if (!token) {
        alert("請先登入");
        window.location.href = "index.html";
        return;
    }

    // 2. 初始化：載入使用者資料
    loadUserProfile();

    // 3. 綁定按鈕事件
    setupEventListeners();

    // 4. 綁定登出按鈕 (獨立綁定)
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    } else {
        console.error("找不到 id='logout-btn' 的按鈕，請檢查 HTML");
    }
});

// --- 定義登出函式 ---
async function handleLogout() {
    const token = localStorage.getItem("redant_token");
    
    // A. 嘗試通知後端 (寫入 Audit Log)
    if (token) {
        try {
            // [修正] 這裡原本寫 API_BASE，已修正為 API_BASE_URL
            await fetch(`${API_BASE_URL}/users/me/logout`, {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${token}` 
                }
            });
            console.log("後端登出紀錄已保存");
        } catch (err) {
            console.warn("無法通知後端登出", err);
        }
    }

    // B. 清除前端 Token
    localStorage.removeItem("redant_token");
    
    // C. 導向回首頁/登入頁
    alert("您已成功登出 👋");
    window.location.href = "index.html"; 
}

// --- 載入使用者資料 ---
async function loadUserProfile() {
    try {
        // 1. 解碼 Token 取得 Email
        const token = localStorage.getItem('redant_token');
        const payloadBase64 = token.split('.')[1];
        const decodedJson = atob(payloadBase64);
        const payload = JSON.parse(decodedJson);
        const myEmail = payload.sub; 

        // 2. 呼叫後端抓清單
        const response = await fetch(`${API_BASE_URL}/users/`, {
            method: 'GET',
            headers: api.getHeaders()
        });
        
        if (!response.ok) throw new Error("無法讀取使用者資料");
        
        const users = await response.json();
        const me = users.find(u => u.email === myEmail);

        if (me) {
            renderProfile(me);
        }

    } catch (error) {
        console.error(error);
        // alert("載入個人資料失敗"); // 怕太吵可以先註解掉
    }
}

// --- 渲染畫面 ---
function renderProfile(user) {
    // 填入名字與 Email
    const nameEl = document.querySelector('.user-name');
    const emailEl = document.querySelector('.user-email');
    
    if (nameEl) nameEl.innerText = user.user_name || "未設定";
    if (emailEl) emailEl.innerText = user.email;

    // 填入角色 (建議 HTML 加個 id="user-role" 會比較穩，這裡先維持原樣)
    const roleEl = document.querySelectorAll('.info-value span')[1]; 
    if (roleEl) {
        let roleName = "Viewer";
        if (user.role_id === 1) roleName = "Admin";
        if (user.role_id === 2) roleName = "User"; // 之前我們把 Role 2 改成 User 了
        roleEl.innerText = roleName;
    }
}

// --- 事件綁定 ---
function setupEventListeners() {
    
    // 1. MFA 開關
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

    // 2. API Token 複製/產生
    const apiTokenDisplay = document.querySelector('.api-token-display span');
    const copyIcon = document.querySelector('.copy-icon');
    
    if (copyIcon) {
        copyIcon.style.cursor = "pointer";
        copyIcon.onclick = async () => {
            if (confirm("要產生一組新的 API Token 嗎？")) {
                try {
                    const res = await fetch(`${API_BASE_URL}/users/me/api_tokens`, {
                        method: 'POST',
                        headers: api.getHeaders()
                    });
                    
                    if(!res.ok) throw new Error("產生失敗");
                    
                    const data = await res.json();
                    if (apiTokenDisplay) {
                        apiTokenDisplay.innerText = data.raw_token; 
                        alert("API Token 已產生！請妥善保存，它只會顯示這一次。");
                    }
                } catch (err) {
                    alert(err.message);
                }
            }
        };
    }
}