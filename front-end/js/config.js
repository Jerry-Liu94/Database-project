// js/config.js

// 如果網域生效了，再改回 "https://redantdam.indiechild.xyz"
export const API_BASE_URL = "https://redantdam.indiechild.xyz"; 

export const api = {
    // 取得 Header (自動帶 Token)
    getHeaders(isFileUpload = false) {
        const token = localStorage.getItem('redant_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (!isFileUpload) headers['Content-Type'] = 'application/json';
        return headers;
    },

    // 檢查是否登入
    checkLogin() {
        const token = localStorage.getItem('redant_token');
        if (!token) {
            alert("請先登入！");
            window.location.href = "login.html";
        }
    }
};