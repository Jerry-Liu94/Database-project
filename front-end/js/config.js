// js/config.js

// 如果網域生效了，再改回 "https://redantdam.indiechild.xyz"
export const API_BASE_URL = "https://redantdam.indiechild.xyz"; 

export const api = {
    // 只有在非 GET 且非檔案上傳時才加 Content-Type，避免預檢 (preflight)
    getHeaders(isFileUpload = false, method = 'GET') {
        const token = localStorage.getItem('redant_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (!isFileUpload && method && method.toUpperCase() !== 'GET') {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    },

    checkLogin() {
        const token = localStorage.getItem('redant_token');
        if (!token) {
            alert("請先登入！");
            window.location.href = "login.html";
        }
    }
};