// apiService.js
// 這是你負責產出的檔案，前端只要引用這個檔

const API_BASE_URL = "http://127.0.0.1:8000"; // 之後上線可以改這裡

// 內部小工具：自動拿 Token
function getHeaders(isFileUpload = false) {
    const token = localStorage.getItem('access_token');
    const headers = {};
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 如果不是上傳檔案，預設用 JSON；上傳檔案時瀏覽器會自動處理 Content-Type
    if (!isFileUpload) {
        headers['Content-Type'] = 'application/json';
    }
    
    return headers;
}

export const apiService = {
    /**
     * 登入功能
     * 注意：後端要求用 x-www-form-urlencoded 格式
     */
    async login(email, password) {
        const formData = new URLSearchParams();
        formData.append('username', email); // 後端規定 key 叫 username
        formData.append('password', password);

        const response = await fetch(`${API_BASE_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        if (!response.ok) {
            throw new Error('登入失敗，請檢查帳號密碼');
        }

        const data = await response.json();
        // 幫前端把 token 存起來
        localStorage.setItem('access_token', data.access_token);
        return data;
    },

    /**
     * 取得使用者列表
     */
    async getUsers() {
        const response = await fetch(`${API_BASE_URL}/users/`, {
            method: 'GET',
            headers: getHeaders()
        });
        return response.json();
    },

    /**
     * 上傳資產
     * @param {File} fileObject - HTML input 拿到的檔案物件
     */
    async uploadAsset(fileObject) {
        const formData = new FormData();
        formData.append('file', fileObject); // 後端規定 key 叫 file

        const response = await fetch(`${API_BASE_URL}/assets/`, {
            method: 'POST',
            headers: getHeaders(true), // true 代表是上傳，不要手動設 Content-Type
            body: formData
        });
        
        if (response.status === 403) {
            throw new Error('權限不足：請確認您的帳號是否有上傳權限');
        }

        return response.json();
    },

    /**
     * 取得資產列表 (支援搜尋)
     */
    async getAssets(keyword = "") {
        let url = `${API_BASE_URL}/assets/`;
        if (keyword) {
            url += `?filename=${encodeURIComponent(keyword)}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders()
        });
        return response.json();
    }
};