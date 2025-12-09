/* js/asset_detail.js
   完整修正版：使用 version_number 進行版本切換與下載
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
        renderDetail(asset);
        setupEventListeners();
    } catch (error) {
        console.error(error);
        alert("載入失敗: " + error.message);
    }
}

// --- Helper: 判斷 URL 是否很可能指向內網 MinIO ---
function isLikelyMinioUrl(url) {
    if (!url) return false;
    try {
        const u = new URL(url);
        return (u.port && (u.port === "9000" || u.port === "9001")) || u.hostname.includes("minio");
    } catch (e) {
        return false;
    }
}

// --- Helper: 把 token 加到 URL（用於 img/video src 或下載連結） ---
function appendTokenToUrl(url) {
    try {
        const token = localStorage.getItem('redant_token');
        if (!token) return url;
        
        const u = new URL(url);
        // 如果原本已經有 token 參數就不重複加
        if (!u.searchParams.has('token')) {
            u.searchParams.set('token', token);
        }
        return u.toString();
    } catch (e) {
        return url;
    }
}

// --- UI: 渲染詳情主入口 ---
function renderDetail(asset) {
    // 1. 基本文字資訊
    const filenameEl = document.getElementById('display-filename');
    const idEl = document.getElementById('display-id');
    if (filenameEl) filenameEl.innerText = asset.filename || '未命名';
    if (idEl) idEl.innerText = `ID: ${asset.asset_id}`;

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

    // Tags
    const tagsDisplay = document.getElementById('display-tags');
    if (tagsDisplay) {
        const tagText = asset.tags && asset.tags.length > 0 
            ? `#${asset.tags.map(t => t.tag_name).join(' #')}` 
            : `#${asset.file_type || '一般'}`;
        tagsDisplay.innerText = tagText;
    }

    // 2. 渲染版本列表 (使用 version_number)
    renderVersionList(asset);

    // 3. 初始預覽 (傳入 null 代表顯示最新版)
    updatePreview(asset, null);

    // 分享連結文字顯示 (最新版)
    const shareUrlText = document.getElementById('share-url-text');
    if (shareUrlText && asset.download_url) {
        shareUrlText.innerText = asset.download_url;
    }
}

// --- [關鍵修改] 渲染版本列表 ---
function renderVersionList(asset) {
    const listContainer = document.getElementById('version-scroll-list');
    if (!listContainer) return;

    listContainer.innerHTML = ''; // 清空舊資料

    // 取得版本列表並依照 version_number 倒序排列 (新 -> 舊)
    const versions = asset.versions || [];
    versions.sort((a, b) => b.version_number - a.version_number);

    if (versions.length === 0) {
        // 若無版本資料，顯示預設按鈕
        const defaultDiv = document.createElement('div');
        defaultDiv.className = 'version-btn active';
        defaultDiv.innerHTML = `<span>最新</span><span>Current</span>`;
        listContainer.appendChild(defaultDiv);
        return;
    }

    // 找出目前最新版的號碼 (通常是排序後的第一個，或從 asset.latest_version 拿)
    const latestVerNum = asset.latest_version ? asset.latest_version.version_number : versions[0].version_number;

    versions.forEach(ver => {
        const btn = document.createElement('div');
        // 判斷是否為最新版
        const isLatest = (ver.version_number === latestVerNum);
        btn.className = `version-btn ${isLatest ? 'active' : 'inactive'}`;
        
        // 顯示日期
        const dateStr = ver.created_at ? new Date(ver.created_at).toLocaleDateString() : 'Unknown';

        btn.innerHTML = `
            <span>${dateStr}</span>
            <span>Version_${ver.version_number}</span>
        `;

        // 點擊切換事件
        btn.onclick = () => {
            // 1. UI 狀態切換
            document.querySelectorAll('.version-btn').forEach(b => {
                b.classList.remove('active');
                b.classList.add('inactive');
            });
            btn.classList.remove('inactive');
            btn.classList.add('active');

            // 2. 更新預覽內容
            // 如果是點擊最新版，傳 null (讓 updatePreview 使用預設邏輯)
            // 如果是舊版，傳 version_number
            updatePreview(asset, isLatest ? null : ver.version_number);
        };

        listContainer.appendChild(btn);
    });
}

// --- [關鍵修改] 更新預覽區域邏輯 ---
function updatePreview(asset, specificVersionNum) {
    const previewBox = document.querySelector('.preview-box');
    if (!previewBox) return;
    previewBox.innerHTML = '';

    const mime = asset.file_type || '';
    let targetUrl = '';

    // 1. 強制由前端建構 URL，不依賴後端回傳的 download_url (避免 localhost/127.0.0.1 混亂)
    // 格式: http://127.0.0.1:8000/assets/{id}/download
    let baseUrl = `${API_BASE_URL}/assets/${asset.asset_id}/download`;

    // 2. 判斷是否要指定版本
    if (specificVersionNum) {
        // 指定版本: ?version_number=1
        targetUrl = `${baseUrl}?version_number=${specificVersionNum}`;
    } else {
        // 最新版本: 直接呼叫 download API，讓後端自己抓 latest
        // 注意：這裡我們不使用 presigned_url，因為它可能有內網 Docker 網域問題
        // 統一走後端 Proxy 下載最穩
        targetUrl = baseUrl;
    }

    // 3. [關鍵] 補上 Token
    // 呼叫 appendTokenToUrl 來確保 ?token=... 有被加上去
    targetUrl = appendTokenToUrl(targetUrl);
    
    // Debug: 你可以在 Console 看到它最後試著連去哪裡
    console.log("Loading Preview URL:", targetUrl);

    if (!targetUrl) {
        previewBox.innerHTML = `<div class="preview-text">無預覽</div>`;
        return;
    }

    // 4. 渲染 DOM
    if (mime.startsWith('video/')) {
        const video = document.createElement('video');
        video.controls = true;
        video.playsInline = true;
        // 設定樣式
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.maxHeight = '600px';
        video.style.objectFit = 'contain'; 
        video.style.backgroundColor = '#000'; // 影片背景黑底比較好看

        const source = document.createElement('source');
        source.src = targetUrl;
        source.type = mime;
        video.appendChild(source);
        
        previewBox.appendChild(video);
        video.load(); // 確保重新載入

    } else if (mime.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = targetUrl;
        img.alt = asset.filename || '';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '600px';
        img.style.objectFit = 'contain';
        
        // 錯誤處理：如果還是讀不到，顯示預設圖
        img.onerror = function() { 
            console.error("圖片載入失敗:", this.src);
            this.style.objectFit = "none"; // 讓 icon 不要被拉伸
            this.src='static/image/upload_grey.png'; 
        };
        previewBox.appendChild(img);

    } else {
        // 其他檔案顯示下載按鈕
        const btn = document.createElement('a');
        btn.href = targetUrl;
        btn.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center;">
                            <img src="static/image/upload_grey.png" style="width:64px; margin-bottom:10px;">
                            <span>${specificVersionNum ? `下載 v${specificVersionNum}` : '下載檔案'}</span>
                         </div>`;
        btn.className = 'btn-action btn-save';
        btn.style.height = 'auto'; // 讓按鈕高度自動
        btn.style.padding = '20px';
        btn.setAttribute('download', asset.filename || 'download');
        previewBox.appendChild(btn);
    }
}

// --- 綁定事件（下載、刪除、分享等） ---
function setupEventListeners() {
    // 下載按鈕 (右上角選單的「下載」) -> 下載最新版
    const menuOptions = document.querySelectorAll('.menu-option');
    menuOptions.forEach(opt => {
        if (opt.innerText.includes("下載")) {
            opt.onclick = () => downloadAsset(assetId); 
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

    // 右上角選單 (Dropdown)
    const menuTrigger = document.getElementById('menu-trigger');
    const dropdownMenu = document.getElementById('dropdown-menu');
    if(menuTrigger) {
        menuTrigger.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            dropdownMenu && dropdownMenu.classList.toggle('show'); 
        });
        document.addEventListener('click', (e) => { 
            if (dropdownMenu && !dropdownMenu.contains(e.target) && e.target !== menuTrigger) {
                dropdownMenu.classList.remove('show'); 
            }
        });
    }

    // 愛心收藏
    const detailHeartBtn = document.getElementById('detail-heart-btn');
    if (detailHeartBtn) {
        detailHeartBtn.addEventListener('click', () => {
            const isFav = detailHeartBtn.src.includes('fill');
            detailHeartBtn.src = isFav ? 'static/image/heart_black.png' : 'static/image/heart_fill_black.png';
            showToast(isFav ? '已取消收藏' : '已加入收藏');
        });
    }

    // 初始化 Modal
    setupModalLogic();
}

// --- Modal 邏輯 (包含 版本上傳 / 影像處理 / 編輯) ---
function setupModalLogic() {
    const dropdownMenu = document.getElementById('dropdown-menu');

    // 1. 分享
    const shareOption = document.getElementById('share-option');
    const shareModal = document.getElementById('share-modal');
    const closeShareX = document.getElementById('close-share-x');
    if (shareOption && shareModal) {
        shareOption.addEventListener('click', () => {
            dropdownMenu && dropdownMenu.classList.remove('show');
            shareModal.style.display = 'flex';
        });
        closeShareX && closeShareX.addEventListener('click', () => shareModal.style.display = 'none');
        shareModal.addEventListener('click', (e) => { if (e.target === shareModal) shareModal.style.display = 'none'; });
    }

    // 2. 編輯資訊
    const editOption = document.getElementById('menu-edit-btn');
    const editModal = document.getElementById('edit-modal');
    const closeEditX = document.getElementById('close-edit-x');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (editOption && editModal) {
        editOption.addEventListener('click', () => {
            dropdownMenu && dropdownMenu.classList.remove('show');
            // 填入當前值
            const dFile = document.getElementById('display-filename');
            const dTags = document.getElementById('display-tags');
            if (dFile) document.getElementById('edit-filename-input').value = dFile.innerText;
            if (dTags) document.getElementById('edit-tags-input').value = dTags.innerText;
            document.getElementById('edit-id-input').value = assetId;

            editModal.style.display = 'flex';
        });
        closeEditX && closeEditX.addEventListener('click', () => editModal.style.display = 'none');
        cancelEditBtn && cancelEditBtn.addEventListener('click', () => editModal.style.display = 'none');
        
        // 綁定影像處理
        setupImageProcessing();

        // 綁定「儲存資訊」按鈕
        const saveEditBtn = document.getElementById('save-edit-btn');
        if (saveEditBtn) {
            saveEditBtn.onclick = async () => {
                const newName = document.getElementById('edit-filename-input').value;
                const newTagsStr = document.getElementById('edit-tags-input').value;
                const tagsArr = newTagsStr.split(/[\s#]+/).filter(x => x);

                try {
                    saveEditBtn.innerText = "儲存中...";
                    const res = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
                        method: 'PATCH',
                        headers: api.getHeaders(false, 'PATCH'),
                        body: JSON.stringify({ filename: newName, tags: tagsArr })
                    });
                    if (!res.ok) throw new Error("更新失敗");
                    
                    alert("更新成功");
                    window.location.reload();
                } catch(e) {
                    alert(e.message);
                    saveEditBtn.innerText = "儲存資訊";
                }
            };
        }
    }

    // 3. 版本上傳
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

        // 拖拉上傳
        if (versionDropZone) {
            versionDropZone.addEventListener('click', () => { if (versionFileInput) versionFileInput.click(); });
            versionDropZone.addEventListener('dragover', (e) => { e.preventDefault(); versionDropZone.style.borderColor = '#666'; });
            versionDropZone.addEventListener('dragleave', (e) => { e.preventDefault(); versionDropZone.style.borderColor = '#8e8e8e'; });
            versionDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                versionDropZone.style.borderColor = '#8e8e8e';
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
                item.innerHTML = `
                    <div class="file-info-left">
                        <img src="static/image/checkmark_grey.png" class="check-icon status-icon">
                        <span class="file-name-text">${file.name}</span>
                    </div>`;
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
                    const formData = new FormData();
                    formData.append('file', files[0]); // 只取第一個

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

                    alert("新版本上傳成功！");
                    versionModal.style.display = 'none';
                    window.location.reload(); 

                } catch (error) {
                    alert("錯誤: " + error.message);
                } finally {
                    saveVersionBtn.innerText = "上傳";
                    saveVersionBtn.disabled = false;
                }
            });
        }
    }

    document.querySelectorAll('.modal-overlay').forEach(ov => {
        ov.addEventListener('click', (e) => { if (e.target === ov) ov.style.display = 'none'; });
    });

    // 內部函式：影像處理
    function setupImageProcessing() {
        const processSelect = document.getElementById('img-process-select');
        const processBtn = document.getElementById('btn-process-image');
        if (!processSelect || !processBtn) return;

        processSelect.addEventListener('change', (e) => {
            const op = e.target.value;
            document.querySelectorAll('.process-params').forEach(el => el.style.display = 'none');
            processBtn.disabled = !op;
            processBtn.style.backgroundColor = op ? "#333" : "#ccc";
            
            if (op === 'rotate') document.getElementById('process-rotate-params').style.display = 'block';
            if (op === 'resize') document.getElementById('process-resize-params').style.display = 'block';
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
                showToast("影像處理成功！新版本已建立");
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                alert(err.message);
                processBtn.innerText = "執行影像處理";
                processBtn.disabled = false;
            }
        });
    }
}

// --- 輔助函式 ---
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function downloadAsset(id) {
    // 下載最新版本
    const url = appendTokenToUrl(`${API_BASE_URL}/assets/${id}/download`);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = document.getElementById('display-filename').innerText || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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