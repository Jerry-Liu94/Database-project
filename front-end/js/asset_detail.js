/* js/asset_detail.js */
import { API_BASE_URL, api } from './config.js';

// 從網址取得 ID (例如 asset_detail.html?id=5)
const urlParams = new URLSearchParams(window.location.search);
const assetId = urlParams.get('id');

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    api.checkLogin();

    if (!assetId) {
        alert("無效的資產 ID");
        window.location.href = "index.html";
        return;
    }

    loadAssetDetail();
    
    // 下載按鈕監聽 (Dropdown Menu 裡的下載選項)
    const menuOptions = document.querySelectorAll('.menu-option');
    menuOptions.forEach(opt => {
        if (opt.innerText.includes("下載")) {
            opt.onclick = downloadAsset;
        }
    });
});

// --- API: 載入資產詳情 ---
async function loadAssetDetail() {
    try {
        // 因為後端目前沒有單一讀取 /assets/{id} 的 API，我們先抓全部再篩選
        const response = await fetch(`${API_BASE_URL}/assets/`, {
            method: 'GET',
            headers: api.getHeaders()
        });

        if (!response.ok) throw new Error("資料讀取失敗");

        const assets = await response.json();
        // 找到符合 ID 的資產
        const asset = assets.find(a => a.asset_id == assetId);

        if (!asset) {
            alert("找不到此資產");
            window.location.href = "index.html";
            return;
        }

        renderDetail(asset);

    } catch (error) {
        console.error(error);
        alert("載入失敗: " + error.message);
    }
}

// --- UI: 渲染詳情 ---
function renderDetail(asset) {
    document.getElementById('display-filename').innerText = asset.filename;
    document.getElementById('display-id').innerText = `ID: ${asset.asset_id}`;
    
    // 假設 asset.uploader 存在 (Schema 有定義)
    const uploaderName = asset.uploader ? asset.uploader.email : "Unknown";
    const fileSize = asset.latest_version ? formatBytes(asset.metadata_info?.filesize || 0) : "--";
    const resolution = asset.metadata_info?.resolution || "--";

    // 填入 info-row (依據 HTML 結構順序: 大小, 解析度, 上傳者)
    const infoValues = document.querySelectorAll('.info-value');
    if (infoValues.length >= 3) {
        infoValues[0].innerText = fileSize;   // 檔案大小
        infoValues[1].innerText = resolution; // 解析度
        infoValues[2].innerText = uploaderName; // 上傳者
    }

    // 標籤顯示 (如果有 display-tags ID)
    const tagsDisplay = document.getElementById('display-tags');
    if (tagsDisplay) {
        // 這裡暫時用檔名或類型當標籤，若後端有回傳 tags 陣列則改用 tags
        tagsDisplay.innerText = `#${asset.file_type || '一般'}`;
    }

    // 預覽圖片
    const previewBox = document.querySelector('.preview-box');
    if (asset.thumbnail_url) {
        // 使用 onerror 處理圖片載入失敗的情況
        previewBox.innerHTML = `<img src="${asset.thumbnail_url}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.src='static/image/upload_grey.png'">`;
    }
}

// --- Helper: 檔案大小格式化 ---
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// --- API: 下載檔案 ---
function downloadAsset() {
    // 使用 fetch + blob 下載，以帶入 Token
    fetch(`${API_BASE_URL}/assets/${assetId}/download`, {
        headers: api.getHeaders()
    })
    .then(res => {
        if(!res.ok) throw new Error("下載失敗");
        return res.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // 嘗試從檔名欄位取得名稱
        const filename = document.getElementById('display-filename').innerText || 'download';
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    })
    .catch(err => alert(err.message));
}

// ==========================================
// UI 互動邏輯 (Modals, Version Select etc.)
// ==========================================

// 1. 版本切換邏輯
window.selectVersion = function(clickedBtn) {
    const allBtns = Array.from(document.querySelectorAll('.version-btn'));
    const index = allBtns.indexOf(clickedBtn);

    // 如果點擊的是最新的 (index 0) -> 直接切換 active 樣式
    if (index === 0) {
        allBtns.forEach(btn => {
            btn.classList.remove('active');
            btn.classList.add('inactive');
        });
        clickedBtn.classList.remove('inactive');
        clickedBtn.classList.add('active');
    } else {
        // 如果是舊版本 -> 開啟還原確認窗 (Restore Logic)
        openRestoreModal(clickedBtn);
    }
}

// 2. 通用 UI (Toast 提示)
const successToast = document.getElementById('success-toast');
function showToast(msg) {
    if(successToast) {
        successToast.innerText = msg;
        successToast.style.display = 'block';
        setTimeout(() => { successToast.style.display = 'none'; }, 2000);
    }
}

// 3. 右上角選單邏輯
const menuTrigger = document.getElementById('menu-trigger');
const dropdownMenu = document.getElementById('dropdown-menu');
if(menuTrigger) {
    menuTrigger.addEventListener('click', (e) => { e.stopPropagation(); dropdownMenu.classList.toggle('show'); });
    document.addEventListener('click', (e) => { if (!dropdownMenu.contains(e.target) && e.target !== menuTrigger) dropdownMenu.classList.remove('show'); });
}

// 4. 分享彈窗
const shareOption = document.getElementById('share-option');
const shareModal = document.getElementById('share-modal');
const closeShareX = document.getElementById('close-share-x');

if(shareOption) {
    shareOption.addEventListener('click', () => { dropdownMenu.classList.remove('show'); shareModal.style.display = 'flex'; });
    const closeShare = () => shareModal.style.display = 'none';
    if(closeShareX) closeShareX.addEventListener('click', closeShare);
    if(shareModal) shareModal.addEventListener('click', (e) => { if (e.target === shareModal) closeShare(); });
}

// 5. 編輯彈窗
const editOption = document.getElementById('menu-edit-btn');
const editModal = document.getElementById('edit-modal');
const closeEditX = document.getElementById('close-edit-x');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const saveEditBtn = document.getElementById('save-edit-btn');

const displayFilename = document.getElementById('display-filename');
const displayId = document.getElementById('display-id');
const displayTags = document.getElementById('display-tags');

const inputFilename = document.getElementById('edit-filename-input');
const inputId = document.getElementById('edit-id-input');
const inputTags = document.getElementById('edit-tags-input');

if(editOption) {
    editOption.addEventListener('click', () => {
        dropdownMenu.classList.remove('show');
        if(displayFilename) inputFilename.value = displayFilename.innerText;
        if(displayId) inputId.value = displayId.innerText;
        if(displayTags) inputTags.value = displayTags.innerText;
        editModal.style.display = 'flex';
    });

    const closeEdit = () => editModal.style.display = 'none';
    if(closeEditX) closeEditX.addEventListener('click', closeEdit);
    if(cancelEditBtn) cancelEditBtn.addEventListener('click', closeEdit);
    if(editModal) editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEdit(); });

    if(saveEditBtn) saveEditBtn.addEventListener('click', () => {
        if(displayFilename) displayFilename.innerText = inputFilename.value;
        if(displayId) displayId.innerText = inputId.value;
        if(displayTags) displayTags.innerText = inputTags.value;
        closeEdit();
        showToast('修改已儲存！');
    });
}

// 6. 上傳新版本 (API Version Upload)
const addVersionBtn = document.getElementById('add-version-btn');
const versionModal = document.getElementById('version-modal');
const closeVersionX = document.getElementById('close-version-x');
const cancelVersionBtn = document.getElementById('cancel-version-btn');
const saveVersionBtn = document.getElementById('save-version-btn');

const vDropZone = document.getElementById('version-drop-zone');
const vFileInput = document.getElementById('version-file-input');
const vEmptyState = document.getElementById('version-empty-state');
const vFileList = document.getElementById('version-file-list');
const versionScrollList = document.getElementById('version-scroll-list');

if(addVersionBtn) {
    addVersionBtn.addEventListener('click', () => { resetVersionModal(); versionModal.style.display = 'flex'; });
    
    const closeVersion = () => versionModal.style.display = 'none';
    if(closeVersionX) closeVersionX.addEventListener('click', closeVersion);
    if(cancelVersionBtn) cancelVersionBtn.addEventListener('click', closeVersion);
    if(versionModal) versionModal.addEventListener('click', (e) => { if (e.target === versionModal) closeVersion(); });

    vDropZone.addEventListener('click', () => vFileInput.click());
    
    vFileInput.addEventListener('change', (e) => { 
        if (e.target.files.length > 0) showVersionFile(e.target.files[0].name); 
    });

    function showVersionFile(name) {
        vDropZone.classList.add('has-file');
        vEmptyState.style.display = 'none';
        vFileList.style.display = 'block';
        vFileList.innerHTML = `
            <div class="file-list-item">
                <div class="file-info-left">
                    <img src="static/image/checkmark_grey.png" class="check-icon status-icon" alt="Check">
                    <span class="file-name-text">${name}</span>
                </div>
            </div>`;
    }

    function resetVersionModal() {
        vDropZone.classList.remove('has-file');
        vEmptyState.style.display = 'flex';
        vFileList.style.display = 'none';
        vFileList.innerHTML = '';
        vFileInput.value = '';
        saveVersionBtn.innerText = "上傳";
        saveVersionBtn.disabled = false;
    }

    // [API 上傳邏輯]
    if(saveVersionBtn) {
        // Clone node to clear old listeners
        const newSaveBtn = saveVersionBtn.cloneNode(true);
        saveVersionBtn.parentNode.replaceChild(newSaveBtn, saveVersionBtn);

        newSaveBtn.addEventListener('click', async () => {
            if (!vDropZone.classList.contains('has-file') || vFileInput.files.length === 0) return;

            newSaveBtn.innerText = "上傳中...";
            newSaveBtn.disabled = true;

            const file = vFileInput.files[0];
            const formData = new FormData();
            formData.append("file", file);

            try {
                // 呼叫後端 API
                const res = await fetch(`${API_BASE_URL}/assets/${assetId}/versions`, {
                    method: 'POST',
                    headers: api.getHeaders(true),
                    body: formData
                });

                if(!res.ok) throw new Error("版本上傳失敗");

                // 成功後更新 UI
                const icon = vFileList.querySelector('.status-icon');
                if (icon) icon.src = 'static/image/checkmark_fill_grey.png';

                // 模擬新增 UI 列表 (實際上重整頁面會更準確)
                const today = new Date();
                const dateStr = today.getFullYear() + '.' + (today.getMonth()+1).toString().padStart(2, '0') + '.' + today.getDate().toString().padStart(2, '0');
                const newVerName = "New Version"; 

                const newBtn = document.createElement('div');
                newBtn.className = 'version-btn active';
                // 讓新版本點擊也能觸發 selectVersion
                newBtn.onclick = function() { 
                    // 手動呼叫全域的 selectVersion
                    window.selectVersion(this); 
                };
                newBtn.innerHTML = `<span>${dateStr}</span><span>${newVerName}</span>`;

                if(versionScrollList) {
                    // 把其他按鈕設為 inactive
                    document.querySelectorAll('.version-btn').forEach(btn => {
                        btn.classList.remove('active');
                        btn.classList.add('inactive');
                    });
                    versionScrollList.insertBefore(newBtn, versionScrollList.firstChild);
                }

                setTimeout(() => {
                    closeVersion();
                    showToast('新版本上傳成功！');
                    // 重新載入以顯示最新狀態
                    setTimeout(() => location.reload(), 500); 
                }, 600);

            } catch (error) {
                alert("錯誤: " + error.message);
                newSaveBtn.innerText = "上傳";
                newSaveBtn.disabled = false;
            }
        });
    }

    // Drag & Drop
    vDropZone.addEventListener('dragover', (e) => { e.preventDefault(); vDropZone.style.borderColor = '#666'; });
    vDropZone.addEventListener('dragleave', (e) => { e.preventDefault(); vDropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; });
    vDropZone.addEventListener('drop', (e) => { 
        e.preventDefault(); 
        vDropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; 
        if (e.dataTransfer.files.length > 0) {
            vFileInput.files = e.dataTransfer.files;
            showVersionFile(e.dataTransfer.files[0].name); 
        }
    });
}

// 7. 全域新增檔案 (Header Add Button) - [新增功能]
const globalAddBtn = document.getElementById('add-btn');
const globalUploadModal = document.getElementById('upload-modal'); // 假設 asset_detail.html 也有這個 modal
// 如果 asset_detail.html 沒有 upload-modal，這段不會執行，不會報錯

if (globalAddBtn && globalUploadModal) {
    // 這裡我們直接導回首頁，或者你可以複製 index.js 的上傳邏輯過來
    // 最簡單的方式：讓使用者回首頁上傳
    globalAddBtn.addEventListener('click', () => {
        window.location.href = "index.html"; 
    });
}

// 8. 版本還原邏輯 (Restore)
const restoreModal = document.getElementById('restore-modal'); // 需確認 HTML 是否有此元素
const confirmRestoreBtn = document.getElementById('confirm-restore-btn');
const cancelRestoreBtn = document.getElementById('cancel-restore-btn');
const restoreVerNameSpan = document.getElementById('restore-ver-name');
const newVerNameSpan = document.getElementById('new-ver-name');

function openRestoreModal(clickedBtn) {
    if (!restoreModal) return; // 如果沒有 modal HTML 就不執行

    const oldVerName = clickedBtn.querySelectorAll('span')[1].innerText;
    if(restoreVerNameSpan) restoreVerNameSpan.innerText = oldVerName;
    if(newVerNameSpan) newVerNameSpan.innerText = "New Version";

    restoreModal.style.display = 'flex';
}

if(cancelRestoreBtn) {
    cancelRestoreBtn.addEventListener('click', () => {
        if(restoreModal) restoreModal.style.display = 'none';
    });
}

if(confirmRestoreBtn) {
    confirmRestoreBtn.addEventListener('click', () => {
        // 這裡暫時只做 UI 效果，因為後端還沒提供 Restore API
        if(restoreModal) restoreModal.style.display = 'none';
        showToast('已還原並建立新版本！(模擬)');
        setTimeout(() => location.reload(), 1000);
    });
}

// ==========================================
// [新增功能] 影像編輯邏輯
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const processSelect = document.getElementById('img-process-select');
    const rotateParams = document.getElementById('process-rotate-params');
    const resizeParams = document.getElementById('process-resize-params');
    const processBtn = document.getElementById('btn-process-image');

    if (!processSelect || !processBtn) return; // 如果頁面沒這些元素就不執行

    // 1. 監聽下拉選單：切換顯示對應的參數輸入框
    processSelect.addEventListener('change', (e) => {
        const operation = e.target.value;
        
        // 先隱藏所有參數區
        document.querySelectorAll('.process-params').forEach(el => el.style.display = 'none');
        
        // 預設狀態 (未選擇時)：按鈕無效、灰色背景
        processBtn.disabled = true;
        processBtn.style.backgroundColor = "#ccc"; // 改淺一點的灰，代表無效
        processBtn.style.color = "#666"; // 文字灰色
        processBtn.style.cursor = "not-allowed";

        // 如果有選擇操作
        if (operation) {
            // 開啟對應參數區
            if (operation === 'rotate') {
                rotateParams.style.display = 'block';
            } else if (operation === 'resize') {
                resizeParams.style.display = 'block';
            }

            // 啟用按鈕：深色背景、白色文字
            processBtn.disabled = false;
            processBtn.style.backgroundColor = "#333"; 
            processBtn.style.color = "#fff"; // ★★★ 關鍵：加上這行，字才會變白 ★★★
            processBtn.style.cursor = "pointer";
        }
    });

    // 2. 監聽執行按鈕：呼叫後端 API
    processBtn.addEventListener('click', async () => {
        const operation = processSelect.value;
        if (!operation) return;

        // 準備 Request Body
        const requestBody = {
            operation: operation,
            params: {}
        };

        // 根據操作填入參數
        if (operation === 'rotate') {
            const angle = document.getElementById('rotate-angle').value;
            requestBody.params.angle = parseInt(angle);
        } else if (operation === 'resize') {
            const w = document.getElementById('resize-width').value;
            const h = document.getElementById('resize-height').value;
            if (!w || !h) {
                alert("請輸入寬度和高度");
                return;
            }
            requestBody.params.width = parseInt(w);
            requestBody.params.height = parseInt(h);
        }

        // UI 更新
        processBtn.innerText = "處理中...";
        processBtn.disabled = true;

        try {
            // 呼叫後端 API
            const res = await fetch(`${API_BASE_URL}/assets/${assetId}/process`, {
                method: 'POST',
                headers: api.getHeaders(), // 自動帶 Token 和 Content-Type: application/json
                body: JSON.stringify(requestBody)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "影像處理失敗");
            }

            // 成功！關閉彈窗並重新整理頁面
            document.getElementById('edit-modal').style.display = 'none';
            showToast("影像處理成功！已建立新版本。");
            
            // 等 toast 顯示一下再重整
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error(error);
            alert("錯誤: " + error.message);
            processBtn.innerText = "執行影像處理";
            processBtn.disabled = false;
        }
    });
});