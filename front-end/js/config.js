// js/config.js

// 如果網域生效了，再改回 "https://redantdam.indiechild.xyz"
export const API_BASE_URL = "https://redantdam.indiechild.xyz"; 

export const api = {
    getHeaders(isFileUpload = false, method = 'GET') {
        const jwtToken = localStorage.getItem('redant_token');
        const apiKey = localStorage.getItem('redant_api_key'); // <--- 讀取 API Key
        
        const headers = {};
        
        // 優先使用 JWT，如果沒有才用 API Key
        if (jwtToken) {
            headers['Authorization'] = `Bearer ${jwtToken}`;
        } else if (apiKey) {
            headers['X-API-TOKEN'] = apiKey; // <--- 帶入 Header
        }

        if (!isFileUpload && method && method.toUpperCase() !== 'GET') {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    },
    
    checkLogin() {
        const jwtToken = localStorage.getItem('redant_token');
        const apiKey = localStorage.getItem('redant_api_key');
        
        // 只要有其中一種 Token 就算登入
        if (!jwtToken && !apiKey) {
            alert("請先登入！");
            window.location.href = "login.html";
        }
    }
};