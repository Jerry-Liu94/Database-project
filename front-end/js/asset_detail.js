/* js/asset_detail.js
   完整版（包含：載入單一資產、優先使用後端 download_url 並附帶 token、避免直接使用內網 MinIO presigned URL、
   modal / 版本上傳 / 影像處理 / 下載 / 刪除 邏輯）
*/
import { API_BASE_URL, api } from './config.js';

// 取得 assetId
const urlParams = new URLSearchParams(window.location.search);
const assetId = urlParams.get('id');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    api.checkLogin();

    if (!assetId) {
        alert("無效的資產 ID");
        window.location.href = "index.html";
        return;
    }

    loadAssetDetail();
});

// --- API: 載入單一資產詳情 ---
async function loadAssetDetail() {
    try {
        const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
            method: 'GET',
            headers: api.getHeaders(false, 'GET')
        });

        if (!response.ok) {
            let errText = "資料讀取失敗";
            try { const err = await response.json(); errText = err.detail || errText; } catch(_) {}
            throw new Error(errText);
        }

        const asset = await response.json();
        // 可視需要在這裏 log asset 做 debug
        // console.log('asset', asset);
        renderDetail(asset);
        setupEventListeners();
    } catch (error) {
        console.error(error);
        alert("載入失敗: " + error.message);
    }
}

// --- Helper: 判斷 URL 是否很可能指向內網 MinIO（避免直接使用 presigned 指向 9000） ---
function isLikelyMinioUrl(url) {
    if (!url) return false;
    try {
        const u = new URL(url);
        return (u.port && (u.port === "9000" || u.port === "9001")) || u.hostname.includes("minio");
    } catch (e) {
        return false;
    }
}

// --- Helper: 判斷是否為 download_url（決定是否要附 token） ---
function isDownloadUrl(url) {
    if (!url) return false;
    try {
        const u = new URL(url);
        return u.pathname.includes('/download');
    } catch (e) {
        return false;
    }
}

// --- Helper: 把 token 加到 URL（若存在） ---
function appendTokenToUrl(url) {
    try {
        const token = localStorage.getItem('redant_token');
        if (!token) return url;
        const u = new URL(url);
        u.searchParams.set('token', token);
        return u.toString();
    } catch (e) {
        return url;
    }
}

// --- UI: 渲染詳情（完整） ---
function renderDetail(asset) {
    // 基本欄位
    const filenameEl = document.getElementById('display-filename');
    const idEl = document.getElementById('display-id');
    if (filenameEl) filenameEl.innerText = asset.filename || '未命名';
    if (idEl) idEl.innerText = `ID: ${asset.asset_id}`;

    // info values
    const uploaderName = asset.uploader ? (asset.uploader.email || asset.uploader.user_name) : "Unknown";
    const fileSize = asset.metadata_info && asset.metadata_info.filesize
        ? formatBytes(asset.metadata_info.filesize)
        : "--";
    const resolution = asset.metadata_info?.resolution || "--";

    const infoValues = document.querySelectorAll('.info-value');
    if (infoValues.length >= 3) {
        infoValues[0].innerText = fileSize;
        infoValues[1].innerText = resolution;
        infoValues[2].innerText = uploaderName;
    }

    // tags
    const tagsDisplay = document.getElementById('display-tags');
    if (tagsDisplay) {
        const tagText = asset.tags && asset.tags.length > 0 ? `#${asset.tags.map(t => t.tag_name).join(' #')}` : `#${asset.file_type || '一般'}`;
        tagsDisplay.innerText = tagText;
    }

    // preview 區塊
    const previewBox = document.querySelector('.preview-box');
    if (!previewBox) return;
    previewBox.innerHTML = '';

    // 選擇 mediaUrl：優先避免指向內網 MinIO 的 presigned_url，若為 download_url 則附 token
    let mediaUrl = null;
    if (asset.presigned_url && !isLikelyMinioUrl(asset.presigned_url)) {
        mediaUrl = asset.presigned_url;
    } else if (asset.download_url) {
        mediaUrl = asset.download_url;
    } else {
        mediaUrl = asset.thumbnail_url || null;
    }

    // 若 mediaUrl 是 download URL，附上 token（讓後端能接受並驗證）
    if (mediaUrl && isDownloadUrl(mediaUrl)) {
        mediaUrl = appendTokenToUrl(mediaUrl);
    }

    const mime = asset.file_type || '';

    if (mime.startsWith('video/') && mediaUrl) {
        const video = document.createElement('video');
        video.controls = true;
        video.playsInline = true;
        video.style.maxWidth = '100%';
        video.style.maxHeight = '600px';
        video.style.borderRadius = '8px';
        video.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';

        const source = document.createElement('source');
        source.src = mediaUrl;
        source.type = mime;
        video.appendChild(source);
        previewBox.appendChild(video);

    } else if (mime.startsWith('image/') && (asset.thumbnail_url || mediaUrl)) {
        const imgUrl = asset.thumbnail_url || mediaUrl;
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = asset.filename || '';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '600px';
        img.style.objectFit = 'contain';
        img.onerror = function() { this.src='static/image/upload_grey.png'; };
        previewBox.appendChild(img);

    } else if (mediaUrl) {
        const btn = document.createElement('a');
        btn.href = mediaUrl;
        btn.innerText = '下載檔案';
        btn.className = 'btn-action btn-save';
        btn.setAttribute('download', asset.filename || 'download');
        previewBox.appendChild(btn);
    } else {
        previewBox.innerHTML = `<div class="preview-text">無預覽</div>`;
    }

    // 分享連結顯示（若有）
    const shareUrlText = document.getElementById('share-url-text');
    if (shareUrlText && asset.download_url) {
        shareUrlText.innerText = asset.download_url;
    }
}

// --- 綁定事件（下載、刪除、分享等） ---
function setupEventListeners() {
    // 下載按鈕 (Dropdown)
    const menuOptions = document.querySelectorAll('.menu-option');
    menuOptions.forEach(opt => {
        if (opt.innerText.includes("下載")) {
            opt.onclick = downloadAsset;
        }
    });

    // 刪除按鈕
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!confirm("⚠️ 確定要永久刪除此資產？")) return;
            try {
                deleteBtn.innerText = "刪除中...";
                const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
                    method: 'DELETE',
                    headers: api.getHeaders(false, 'DELETE')
                });
                if (!response.ok) {
                    let errText = "刪除失敗";
                    try { const e = await response.json(); errText = e.detail || errText; } catch(_) {}
                    throw new Error(errText);
                }
                alert("🗑️ 資產已成功刪除！");
                window.location.href = "index.html";
            } catch (error) {
                console.error(error);
                alert("錯誤: " + error.message);
                deleteBtn.innerText = "刪除";
            }
        });
    }

    // 分享複製連結
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const shareUrlText = document.getElementById('share-url-text');
    if (copyLinkBtn && shareUrlText) {
        copyLinkBtn.addEventListener('click', () => {
            const text = shareUrlText.innerText;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => showToast("連結已複製！"));
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
                showToast("連結已複製！");
            }
        });
    }

    // 右上角選單開關（dropdown）
    const menuTrigger = document.getElementById('menu-trigger');
    const dropdownMenu = document.getElementById('dropdown-menu');
    if(menuTrigger) {
        menuTrigger.addEventListener('click', (e) => { e.stopPropagation(); dropdownMenu && dropdownMenu.classList.toggle('show'); });
        document.addEventListener('click', (e) => { if (dropdownMenu && !dropdownMenu.contains(e.target) && e.target !== menuTrigger) dropdownMenu.classList.remove('show'); });
    }

    // 愛心收藏（UI 切換）
    const detailHeartBtn = document.getElementById('detail-heart-btn');
    if (detailHeartBtn) {
        detailHeartBtn.addEventListener('click', () => {
            const isFav = detailHeartBtn.src.includes('fill');
            if (isFav) {
                detailHeartBtn.src = 'static/image/heart_black.png';
                showToast('已取消收藏');
            } else {
                detailHeartBtn.src = 'static/image/heart_fill_black.png';
                showToast('已加入收藏');
            }
        });
    }

    // 初始化 modal 與版本上傳邏輯
    setupModalLogic();
}

// --- 完整的 setupModalLogic 實作（包含 版本上傳/分享/編輯/影像處理） ---
function setupModalLogic() {
    const dropdownMenu = document.getElementById('dropdown-menu');

    // 分享彈窗
    const shareOption = document.getElementById('share-option');
    const shareModal = document.getElementById('share-modal');
    const closeShareX = document.getElementById('close-share-x');

    if (shareOption && shareModal) {
        shareOption.addEventListener('click', () => {
            dropdownMenu && dropdownMenu.classList.remove('show');
            shareModal.style.display = 'flex';
        });

        closeShareX && closeShareX.addEventListener('click', () => {
            shareModal.style.display = 'none';
        });

        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) shareModal.style.display = 'none';
        });
    }

    // 編輯彈窗
    const editOption = document.getElementById('menu-edit-btn');
    const editModal = document.getElementById('edit-modal');
    const closeEditX = document.getElementById('close-edit-x');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    if (editOption && editModal) {
        editOption.addEventListener('click', () => {
            dropdownMenu && dropdownMenu.classList.remove('show');

            // 填值
            const displayFilenameEl = document.getElementById('display-filename');
            const displayIdEl = document.getElementById('display-id');
            const displayTagsEl = document.getElementById('display-tags');
            const editFilenameInput = document.getElementById('edit-filename-input');
            const editIdInput = document.getElementById('edit-id-input');
            const editTagsInput = document.getElementById('edit-tags-input');

            if (editFilenameInput && displayFilenameEl) editFilenameInput.value = displayFilenameEl.innerText || '';
            if (editIdInput && displayIdEl) editIdInput.value = (displayIdEl.innerText || '').replace(/^ID:?\s*/i, '');
            if (editTagsInput && displayTagsEl) editTagsInput.value = displayTagsEl.innerText || '';

            editModal.style.display = 'flex';
        });

        closeEditX && closeEditX.addEventListener('click', () => editModal.style.display = 'none');
        cancelEditBtn && cancelEditBtn.addEventListener('click', () => editModal.style.display = 'none');

        // 初始化影像處理 UI 與綁定
        setupImageProcessing();
    }

    // 版本上傳彈窗
    const addVersionBtn = document.getElementById('add-version-btn');
    const versionModal = document.getElementById('version-modal');
    const closeVersionX = document.getElementById('close-version-x');
    const cancelVersionBtn = document.getElementById('cancel-version-btn');
    const versionDropZone = document.getElementById('version-drop-zone');
    const versionEmptyState = document.getElementById('version-empty-state');
    const versionFileList = document.getElementById('version-file-list');
    const versionFileInput = document.getElementById('version-file-input');

    if (addVersionBtn && versionModal) {
        addVersionBtn.addEventListener('click', () => { versionModal.style.display = 'flex'; });

        closeVersionX && closeVersionX.addEventListener('click', () => { versionModal.style.display = 'none'; });
        cancelVersionBtn && cancelVersionBtn.addEventListener('click', () => { versionModal.style.display = 'none'; });

        versionModal.addEventListener('click', (e) => {
            if (e.target === versionModal) versionModal.style.display = 'none';
        });

        if (versionDropZone) {
            versionDropZone.addEventListener('click', () => { if (versionFileInput) versionFileInput.click(); });

            versionDropZone.addEventListener('dragover', (e) => { e.preventDefault(); versionDropZone.style.borderColor = '#666'; });
            versionDropZone.addEventListener('dragleave', (e) => { e.preventDefault(); versionDropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; });
            versionDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                versionDropZone.style.borderColor = 'rgba(142, 142, 142, 1)';
                if (e.dataTransfer.files.length > 0) handleVersionFiles(Array.from(e.dataTransfer.files));
            });
        }

        if (versionFileInput) {
            versionFileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) handleVersionFiles(Array.from(e.target.files));
            });
        }

        function handleVersionFiles(files) {
            if (!versionFileList || !versionEmptyState) return;
            versionEmptyState.style.display = 'none';
            versionFileList.style.display = 'block';
            versionFileList.innerHTML = '';
            files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'file-list-item';
                item.innerHTML = `<div class="file-info-left"><img src="static/image/checkmark_grey.png" class="check-icon status-icon"><span class="file-name-text">${file.name}</span></div>`;
                versionFileList.appendChild(item);
            });
        }

        const saveVersionBtn = document.getElementById('save-version-btn');
        if (saveVersionBtn) {
            saveVersionBtn.addEventListener('click', async () => {
                const files = versionFileInput ? versionFileInput.files : null;
                if (!files || files.length === 0) {
                    alert("請先選擇檔案");
                    return;
                }

                saveVersionBtn.innerText = "上傳中...";
                saveVersionBtn.disabled = true;

                try {
                    for (let i = 0; i < files.length; i++) {
                        const formData = new FormData();
                        formData.append('file', files[i]);

                        // isFileUpload=true, method='POST'
                        const res = await fetch(`${API_BASE_URL}/assets/${assetId}/versions`, {
                            method: 'POST',
                            headers: api.getHeaders(true, 'POST'),
                            body: formData
                        });

                        if (!res.ok) {
                            let errMsg = "上傳失敗";
                            try { const e = await res.json(); errMsg = e.detail || errMsg; } catch(_) {}
                            throw new Error(errMsg);
                        }
                    }

                    alert("上傳成功！");
                    versionModal.style.display = 'none';
                    setTimeout(() => window.location.reload(), 800);

                } catch (error) {
                    alert("錯誤: " + error.message);
                } finally {
                    saveVersionBtn.innerText = "上傳";
                    saveVersionBtn.disabled = false;
                }
            });
        }
    }

    // 點擊 overlay 即關閉（備援）
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(ov => {
        ov.addEventListener('click', (e) => {
            if (e.target === ov) ov.style.display = 'none';
        });
    });

    // 內部：影像處理綁定
    function setupImageProcessing() {
        const processSelect = document.getElementById('img-process-select');
        const processBtn = document.getElementById('btn-process-image');
        if (!processSelect || !processBtn) return;

        processSelect.addEventListener('change', (e) => {
            const op = e.target.value;
            document.querySelectorAll('.process-params').forEach(el => el.style.display = 'none');
            processBtn.disabled = !op;
            processBtn.style.backgroundColor = op ? "#333" : "#ccc";
            processBtn.style.color = op ? "#fff" : "#666";

            if (op === 'rotate') document.getElementById('process-rotate-params') && (document.getElementById('process-rotate-params').style.display = 'block');
            if (op === 'resize') document.getElementById('process-resize-params') && (document.getElementById('process-resize-params').style.display = 'block');
        });

        processBtn.addEventListener('click', async () => {
            const operation = processSelect.value;
            const requestBody = { operation: operation, params: {} };

            if (operation === 'rotate') {
                requestBody.params.angle = parseInt(document.getElementById('rotate-angle').value);
            } else if (operation === 'resize') {
                requestBody.params.width = parseInt(document.getElementById('resize-width').value);
                requestBody.params.height = parseInt(document.getElementById('resize-height').value);
            }

            processBtn.innerText = "處理中...";
            processBtn.disabled = true;

            try {
                const res = await fetch(`${API_BASE_URL}/assets/${assetId}/process`, {
                    method: 'POST',
                    headers: api.getHeaders(false, 'POST'),
                    body: JSON.stringify(requestBody)
                });

                if (!res.ok) {
                    let errText = "影像處理失敗";
                    try { const jj = await res.json(); errText = jj.detail || errText; } catch(_) {}
                    throw new Error(errText);
                }

                showToast("影像處理成功！");
                setTimeout(() => window.location.reload(), 1500);

            } catch (err) {
                alert(err.message);
                processBtn.innerText = "執行影像處理";
                processBtn.disabled = false;
            }
        });
    } // end setupImageProcessing
} // end setupModalLogic

// --- 輔助函式 ---
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function downloadAsset() {
    fetch(`${API_BASE_URL}/assets/${assetId}/download`, { headers: api.getHeaders(false, 'GET') })
    .then(res => {
        if(!res.ok) throw new Error("下載失敗");
        return res.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.getElementById('display-filename').innerText || 'download';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    })
    .catch(err => alert(err.message));
}

function showToast(msg) {
    const t = document.getElementById('success-toast');
    if(t) {
        t.innerText = msg;
        t.style.display = 'block';
        setTimeout(() => { t.style.display = 'none'; }, 2000);
    } else {
        alert(msg);
    }
}