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
// --- 渲染畫面 ---
function renderProfile(user) {
    // 1. 填入基本資料 (原本的程式碼)
    const nameEl = document.querySelector('.user-name');
    const emailEl = document.querySelector('.user-email');
    if (nameEl) nameEl.innerText = user.user_name || "未設定";
    if (emailEl) emailEl.innerText = user.email;

    // ★★★ [修改] 職稱改抓 role_name ★★★
    const titleEl = document.getElementById('user-title');
    if (titleEl) {
        // 顯示 Role Name (例如 Admin 或 User)
        titleEl.innerText = user.role_name || "未設定";
    }

    // 權限等級 (保持顯示 ID 即可，或者您想隱藏也可以)
    const roleEl = document.getElementById('user-role'); 
    if (roleEl) {
        roleEl.innerText = user.role_id !== undefined ? user.role_id : "N/A";
    }

    // ★★★ 新增這段：動態修改 Logo 連結 ★★★
    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        // 如果是 Admin (role_id = 1)，點擊 Logo 回到用戶管理頁面
        if (user.role_id === 1) {
            logoLink.href = "user_management.html";
        } else {
            // 其他人回到首頁 (這行其實可以省略，因為 HTML 預設就是 index.html)
            logoLink.href = "index.html";
        }
    }
    // ★★★ 結束新增 ★★★


    // ... (原本的 MFA 開關邏輯保持不變) ...
    // js/profile.js 的 renderProfile 函式內

    // 假設後端回傳的 user 物件有 mfa_enabled 欄位
    const mfaToggle = document.getElementById('mfa-toggle');
    const mfaStatusText = document.getElementById('mfa-status-text'); // 請對應我在 HTML 加的 ID

    if (mfaToggle && user.mfa_enabled) {
        mfaToggle.checked = true;
        mfaToggle.disabled = true; // 如果啟用後不允許輕易關閉，可以鎖定
        if(mfaStatusText) mfaStatusText.style.display = "inline";
    } else {
        mfaToggle.checked = false;
        if(mfaStatusText) mfaStatusText.style.display = "none";
    }
    // ...
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