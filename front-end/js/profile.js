/* js/profile.js */
import { API_BASE_URL, api } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    api.checkLogin();
    
    // 1. 初始化：載入使用者資料
    loadUserProfile();

    // 2. 綁定按鈕事件
    setupEventListeners();
});

// --- 載入使用者資料 ---
async function loadUserProfile() {
    try {
        // 因為後端目前只有 "列出所有使用者" (/users/) 的 API
        // 我們必須先抓全部，再用 Token 裡的 Email 來過濾出「我自己」
        // (這不是最佳解法，但配合目前的後端程式碼只能這樣做)
        
        // 1. 解碼 Token 取得 Email (Payload 是 Base64 編碼的)
        const token = localStorage.getItem('redant_token');
        const payloadBase64 = token.split('.')[1];
        const decodedJson = atob(payloadBase64);
        const payload = JSON.parse(decodedJson);
        const myEmail = payload.sub; // Token 裡面的 email

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
        alert("載入個人資料失敗");
    }
}

// --- 渲染畫面 ---
function renderProfile(user) {
    // 填入名字與 Email
    const nameEl = document.querySelector('.user-name');
    const emailEl = document.querySelector('.user-email');
    
    if (nameEl) nameEl.innerText = user.user_name || "未設定";
    if (emailEl) emailEl.innerText = user.email;

    // 填入角色 (權限)
    const roleEl = document.querySelectorAll('.info-value span')[1]; // 假設第二個是權限
    if (roleEl) {
        let roleName = "Viewer";
        if (user.role_id === 1) roleName = "Admin";
        if (user.role_id === 2) roleName = "Editor";
        roleEl.innerText = roleName;
    }
}

// --- 事件綁定 ---
function setupEventListeners() {
    
    // 1. MFA 開關 (連結到 mfa.html 或 autho.html)
    const mfaToggle = document.getElementById('mfa-toggle');
    if (mfaToggle) {
        mfaToggle.addEventListener('change', async (e) => {
            if (e.target.checked) {
                // 使用者想開啟 MFA
                if (confirm("您確定要啟用多因素認證嗎？這將需要您使用 Google Authenticator 掃描 QR Code。")) {
                    try {
                        // 呼叫後端產生 Secret
                        const res = await fetch(`${API_BASE_URL}/users/me/mfa/generate`, {
                            method: 'GET',
                            headers: api.getHeaders()
                        });
                        
                        if(!res.ok) throw new Error("無法產生 MFA 金鑰");
                        
                        const data = await res.json();
                        
                        // 這裡有兩個選擇：
                        // A. 跳轉到一個專門顯示 QR Code 的頁面
                        // B. 直接在 profile 頁面彈出 QR Code (比較複雜)
                        
                        // 我們先簡單做：跳轉去驗證頁面，並把 secret 帶過去(或是後端已經存了)
                        // 其實更好的流程是：跳出 Modal 顯示 data.otp_uri 轉成的 QR Code
                        
                        alert("MFA 金鑰已產生！請前往驗證頁面進行綁定。");
                        
                        // 為了簡單演示，我們先假設產生後就跳轉去輸入驗證碼
                        // 你可能需要一個中間頁來顯示 QR Code，這裡先用 autho.html
                        window.location.href = "autho.html"; 

                    } catch (err) {
                        alert(err.message);
                        e.target.checked = false; // 恢復開關
                    }
                } else {
                    e.target.checked = false; // 取消
                }
            }
        });
    }

    // 2. API Token 複製/產生
    const apiTokenDisplay = document.querySelector('.api-token-display span');
    const copyIcon = document.querySelector('.copy-icon');
    
    // 點擊複製 icon 變成「產生 Token」功能
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
                        apiTokenDisplay.innerText = data.raw_token; // 顯示明碼 Token
                        alert("API Token 已產生！請妥善保存，它只會顯示這一次。");
                    }
                } catch (err) {
                    alert(err.message);
                }
            }
        };
    }
}