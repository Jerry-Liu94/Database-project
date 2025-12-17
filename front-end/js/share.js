/* js/share_view.js */
import { API_BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 從網址取得 Token (例如 share_view.html?token=abc-123)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showError("無效的連結參數");
        return;
    }

    try {
        // 2. 呼叫後端公開 API 取得資訊 (不用帶 Token Header)
        const response = await fetch(`${API_BASE_URL}/share/${token}/info`);
        
        if (!response.ok) {
            throw new Error("連結已過期或失效");
        }

        const data = await response.json();
        renderSharePage(data, token);

    } catch (error) {
        showError(error.message);
    }
});

function renderSharePage(data, token) {
    document.getElementById('main-container').style.display = 'flex';
    document.getElementById('file-name').innerText = data.filename;
    document.getElementById('file-size').innerText = formatBytes(data.filesize);
    
    // 設定下載按鈕
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.href = data.download_link; // 這是後端回傳的公開下載連結
    downloadBtn.setAttribute('download', data.filename);

    // 處理預覽
    const previewArea = document.getElementById('preview-area');
    const fileType = data.file_type || "";
    const previewUrl = data.download_link; // 圖片/影片直接用下載連結來預覽

    if (fileType.startsWith('image/')) {
        previewArea.innerHTML = `<img src="${previewUrl}" class="share-preview" alt="Preview">`;
    } else if (fileType.startsWith('video/')) {
        previewArea.innerHTML = `
            <video controls autoplay name="media" class="share-preview" style="max-height: 100%;">
                <source src="${previewUrl}" type="${fileType}">
                您的瀏覽器不支援影片預覽
            </video>`;
    } else {
        previewArea.innerHTML = `<div style="color: #fff; font-size: 1.2rem;">此檔案類型不支援預覽，請直接下載。</div>`;
    }
}

function showError(msg) {
    document.getElementById('main-container').style.display = 'none';
    const errBox = document.getElementById('error-message');
    errBox.style.display = 'block';
    errBox.querySelector('p').innerText = msg;
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}