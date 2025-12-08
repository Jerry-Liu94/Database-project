/* js/asset_detail.js */
import { API_BASE_URL, api } from './config.js';

// 從網址取得 ID
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
    initFavoriteStatus(); // 檢查收藏狀態

    // 下載按鈕監聽
    const menuOptions = document.querySelectorAll('.menu-option');
    menuOptions.forEach(opt => {
        if (opt.innerText.includes("下載")) {
            opt.onclick = downloadAsset;
        }
    });

    // 刪除按鈕監聽 (若有)
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!confirm("⚠️ 確定要永久刪除此資產嗎？")) return;
            try {
                deleteBtn.innerText = "刪除中...";
                const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
                    method: 'DELETE',
                    headers: api.getHeaders()
                });
                if (!response.ok) throw new Error("刪除失敗");
                alert("🗑️ 資產已刪除！");
                window.location.href = "index.html";
            } catch (error) {
                alert("錯誤: " + error.message);
                deleteBtn.innerText = "刪除";
            }
        });
    }
});

// --- API: 載入資產詳情 ---
async function loadAssetDetail() {
    try {
        const response = await fetch(`${API_BASE_URL}/assets/`, {
            method: 'GET',
            headers: api.getHeaders()
        });
        if (!response.ok) throw new Error("讀取失敗");
        const assets = await response.json();
        const asset = assets.find(a => a.asset_id == assetId);

        if (!asset) {
            alert("找不到此資產");
            window.location.href = "index.html";
            return;
        }
        renderDetail(asset);
    } catch (error) {
        console.error(error);
    }
}

function renderDetail(asset) {
    document.getElementById('display-filename').innerText = asset.filename;
    document.getElementById('display-id').innerText = `ID: ${asset.asset_id}`;
    
    const uploaderName = asset.uploader ? asset.uploader.email : "Unknown";
    const fileSize = asset.latest_version ? formatBytes(asset.metadata_info?.filesize || 0) : "--";
    const resolution = asset.metadata_info?.resolution || "--";

    const infoValues = document.querySelectorAll('.info-value');
    if (infoValues.length >= 3) {
        infoValues[0].innerText = fileSize;
        infoValues[1].innerText = resolution;
        infoValues[2].innerText = uploaderName;
    }

    const tagsDisplay = document.getElementById('display-tags');
    if (tagsDisplay) tagsDisplay.innerText = `#${asset.file_type || '一般'}`;

    const previewBox = document.querySelector('.preview-box');
    if (asset.thumbnail_url) {
        previewBox.innerHTML = `<img src="${asset.thumbnail_url}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.src='static/image/upload_grey.png'">`;
    }
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function downloadAsset() {
    fetch(`${API_BASE_URL}/assets/${assetId}/download`, { headers: api.getHeaders() })
    .then(res => { if(!res.ok) throw new Error("下載失敗"); return res.blob(); })
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

// ==========================================
// 收藏功能 (localStorage)
// ==========================================
const detailHeartBtn = document.getElementById('detail-heart-btn');
let isFavorite = false;

function getLocalFavorites() {
    const stored = localStorage.getItem('dam_favorites');
    return stored ? JSON.parse(stored) : [];
}

function initFavoriteStatus() {
    if (!assetId) return;
    const myFavs = getLocalFavorites();
    if (myFavs.includes(String(assetId))) {
        isFavorite = true;
        if(detailHeartBtn) detailHeartBtn.src = 'static/image/heart_fill_grey.png'; // 實心灰
    } else {
        isFavorite = false;
        if(detailHeartBtn) detailHeartBtn.src = 'static/image/heart_black.png'; // 空心黑
    }
}

if (detailHeartBtn) {
    detailHeartBtn.addEventListener('click', () => {
        if (!assetId) return;
        let myFavs = getLocalFavorites();
        const idStr = String(assetId);

        isFavorite = !isFavorite;
        if (isFavorite) {
            detailHeartBtn.src = 'static/image/heart_fill_black.png';
            showToast('已加入收藏');
            if (!myFavs.includes(idStr)) myFavs.push(idStr);
        } else {
            detailHeartBtn.src = 'static/image/heart_black.png';
            showToast('已取消收藏');
            myFavs = myFavs.filter(id => id !== idStr);
        }
        localStorage.setItem('dam_favorites', JSON.stringify(myFavs));
    });
}

// ==========================================
// UI 互動 (Modals)
// ==========================================
const successToast = document.getElementById('success-toast');
function showToast(msg) {
    if(successToast) {
        successToast.innerText = msg;
        successToast.style.display = 'block';
        setTimeout(() => { successToast.style.display = 'none'; }, 2000);
    }
}

// Menu Toggle
const menuTrigger = document.getElementById('menu-trigger');
const dropdownMenu = document.getElementById('dropdown-menu');
if(menuTrigger) {
    menuTrigger.addEventListener('click', (e) => { e.stopPropagation(); dropdownMenu.classList.toggle('show'); });
    document.addEventListener('click', (e) => { if (!dropdownMenu.contains(e.target) && e.target !== menuTrigger) dropdownMenu.classList.remove('show'); });
}

// Share Modal
const shareOption = document.getElementById('share-option');
const shareModal = document.getElementById('share-modal');
const closeShareX = document.getElementById('close-share-x');
if(shareOption) {
    shareOption.addEventListener('click', () => { dropdownMenu.classList.remove('show'); shareModal.style.display = 'flex'; });
    const closeShare = () => shareModal.style.display = 'none';
    if(closeShareX) closeShareX.addEventListener('click', closeShare);
    if(shareModal) shareModal.addEventListener('click', (e) => { if (e.target === shareModal) closeShare(); });
}

// Edit Modal & Image Processing
const editOption = document.getElementById('menu-edit-btn');
const editModal = document.getElementById('edit-modal');
const closeEditX = document.getElementById('close-edit-x');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const saveEditBtn = document.getElementById('save-edit-btn');

// Image Process Elements
const imgProcessSelect = document.getElementById('img-process-select');
const processRotateParams = document.getElementById('process-rotate-params');
const processResizeParams = document.getElementById('process-resize-params');
const btnProcessImage = document.getElementById('btn-process-image');

if(editOption) {
    editOption.addEventListener('click', () => {
        dropdownMenu.classList.remove('show');
        document.getElementById('edit-filename-input').value = document.getElementById('display-filename').innerText;
        document.getElementById('edit-id-input').value = document.getElementById('display-id').innerText;
        editModal.style.display = 'flex';
    });
    
    const closeEdit = () => editModal.style.display = 'none';
    if(closeEditX) closeEditX.addEventListener('click', closeEdit);
    if(cancelEditBtn) cancelEditBtn.addEventListener('click', closeEdit);
    if(editModal) editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEdit(); });

    if(saveEditBtn) saveEditBtn.addEventListener('click', () => {
        document.getElementById('display-filename').innerText = document.getElementById('edit-filename-input').value;
        closeEdit();
        showToast('修改已儲存！');
    });

    // 影像處理邏輯
    if(imgProcessSelect) {
        imgProcessSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            processRotateParams.style.display = 'none';
            processResizeParams.style.display = 'none';
            btnProcessImage.disabled = true;
            btnProcessImage.style.backgroundColor = '#555';

            if(val) {
                btnProcessImage.disabled = false;
                btnProcessImage.style.backgroundColor = '#D2E3FC'; 
                btnProcessImage.style.color = '#333';
                if(val === 'rotate') processRotateParams.style.display = 'block';
                if(val === 'resize') processResizeParams.style.display = 'block';
            }
        });
    }

    if(btnProcessImage) {
        btnProcessImage.addEventListener('click', async () => {
            const operation = imgProcessSelect.value;
            if (!operation) return;

            const requestBody = { operation: operation, params: {} };
            if (operation === 'rotate') {
                requestBody.params.angle = parseInt(document.getElementById('rotate-angle').value);
            } else if (operation === 'resize') {
                const w = document.getElementById('resize-width').value;
                const h = document.getElementById('resize-height').value;
                if (!w || !h) { alert("請輸入寬高"); return; }
                requestBody.params.width = parseInt(w);
                requestBody.params.height = parseInt(h);
            }

            btnProcessImage.innerText = "處理中...";
            btnProcessImage.disabled = true;

            try {
                const res = await fetch(`${API_BASE_URL}/assets/${assetId}/process`, {
                    method: 'POST',
                    headers: api.getHeaders(),
                    body: JSON.stringify(requestBody)
                });
                if (!res.ok) throw new Error("處理失敗");
                
                editModal.style.display = 'none';
                showToast("影像處理成功！已建立新版本。");
                setTimeout(() => location.reload(), 1500);
            } catch (error) {
                alert("錯誤: " + error.message);
                btnProcessImage.innerText = "執行影像處理";
                btnProcessImage.disabled = false;
            }
        });
    }
}

// ==========================================
// 全域新增資產 (Header Add Button) - [修正跳轉問題]
// ==========================================
const addBtn = document.getElementById('add-btn');
const globalModal = document.getElementById('upload-modal');
const globalCloseX = document.getElementById('close-modal-x');
const globalCancel = document.getElementById('cancel-btn');
const globalUpload = document.getElementById('upload-btn-action');
const globalDrop = document.getElementById('drop-zone');
const globalInput = document.getElementById('file-input');
const globalList = document.getElementById('file-list-container');
const globalEmpty = document.getElementById('empty-state');
const globalBtns = document.querySelector('.modal-buttons');
const globalSuccess = document.getElementById('success-msg');

if (addBtn) {
    // [關鍵] 加入 preventDefault 確保不跳轉
    addBtn.addEventListener('click', (e) => { 
        e.preventDefault();
        e.stopPropagation();
        globalModal.style.display = 'flex'; 
        resetGlobalFileState(); 
    });
    
    function closeGlobal() { globalModal.style.display = 'none'; }
    if(globalCloseX) globalCloseX.addEventListener('click', closeGlobal);
    if(globalCancel) globalCancel.addEventListener('click', closeGlobal);
    if(globalModal) globalModal.addEventListener('click', (e) => { if(e.target === globalModal) closeGlobal(); });

    if(globalDrop) globalDrop.addEventListener('click', () => { if(globalBtns.style.display !== 'none') globalInput.click(); });
    if(globalInput) globalInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleGlobalFiles(Array.from(e.target.files)); });

    function handleGlobalFiles(files) {
        if (!globalDrop.classList.contains('has-file')) {
            globalDrop.classList.add('has-file');
            globalEmpty.style.display = 'none';
            globalList.style.display = 'block';
        }
        files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'file-list-item';
            item.innerHTML = `<div class="file-info-left"><img src="static/image/checkmark_grey.png" class="check-icon status-icon"><span class="file-name-text">${file.name}</span></div>`;
            globalList.appendChild(item);
        });
    }

    if(globalUpload) {
        // 使用 cloneNode 清除舊事件
        const newGlobalUpload = globalUpload.cloneNode(true);
        globalUpload.parentNode.replaceChild(newGlobalUpload, globalUpload);

        newGlobalUpload.addEventListener('click', async () => {
            const files = globalInput.files;
            if (files.length === 0) { alert("請先選擇檔案"); return; }

            newGlobalUpload.innerText = "上傳中...";
            newGlobalUpload.disabled = true;

            try {
                for (let i = 0; i < files.length; i++) {
                    const formData = new FormData();
                    formData.append('file', files[i]);
                    await fetch(`${API_BASE_URL}/assets/`, {
                        method: 'POST',
                        headers: api.getHeaders(true),
                        body: formData
                    });
                }

                // 成功 UI
                const rows = document.querySelectorAll('#file-list-container .file-list-item');
                rows.forEach(row => {
                    const icon = row.querySelector('.status-icon'); 
                    if (icon) icon.src = 'static/image/checkmark_fill_grey.png';
                });
                
                if(globalBtns) globalBtns.style.display = 'none';
                if(globalSuccess) globalSuccess.style.display = 'flex'; // 顯示成功訊息 (含勾勾圖)

                setTimeout(() => { closeGlobal(); }, 1500);

            } catch (error) {
                alert("上傳錯誤: " + error.message);
                newGlobalUpload.innerText = "上傳";
                newGlobalUpload.disabled = false;
            }
        });
    }

    function resetGlobalFileState() {
        globalDrop.classList.remove('has-file'); 
        globalEmpty.style.display = 'flex'; 
        globalList.style.display = 'none'; 
        globalList.innerHTML = ''; 
        globalInput.value = '';
        if(globalBtns) globalBtns.style.display = 'flex'; 
        if(globalSuccess) globalSuccess.style.display = 'none';
        // 重置按鈕
        const btn = document.getElementById('upload-btn-action'); // 重新抓取新的按鈕元素
        if(btn) { btn.innerText = "上傳"; btn.disabled = false; }
    }
}

// 7. 頁面專屬: 上傳新版本 (New Version Modal)
const vAddBtn = document.getElementById('add-version-btn');
const vModal = document.getElementById('version-modal');
const vCloseX = document.getElementById('close-version-x');
const vCancel = document.getElementById('cancel-version-btn');
const vSave = document.getElementById('save-version-btn');
const vDrop = document.getElementById('version-drop-zone');
const vInput = document.getElementById('version-file-input');
const vEmpty = document.getElementById('version-empty-state');
const vList = document.getElementById('version-file-list');
const vScrollList = document.getElementById('version-scroll-list');

if(vAddBtn) {
    vAddBtn.addEventListener('click', () => { 
        vDrop.classList.remove('has-file');
        vEmpty.style.display = 'flex';
        vList.style.display = 'none';
        vList.innerHTML = '';
        vInput.value = '';
        vSave.innerText = "上傳";
        vSave.disabled = false;
        vModal.style.display = 'flex'; 
    });
    
    const closeV = () => vModal.style.display = 'none';
    if(vCloseX) vCloseX.addEventListener('click', closeV);
    if(vCancel) vCancel.addEventListener('click', closeV);
    if(vModal) vModal.addEventListener('click', (e) => { if(e.target === vModal) closeV(); });

    vDrop.addEventListener('click', () => vInput.click());
    vInput.addEventListener('change', (e) => { 
        if (e.target.files.length > 0) {
            vDrop.classList.add('has-file');
            vEmpty.style.display = 'none';
            vList.style.display = 'block';
            vList.innerHTML = `
                <div class="file-list-item">
                    <div class="file-info-left">
                        <img src="static/image/checkmark_grey.png" class="check-icon status-icon" alt="Check">
                        <span class="file-name-text">${e.target.files[0].name}</span>
                    </div>
                </div>`;
        }
    });

    if(vSave) {
        const newVSave = vSave.cloneNode(true);
        vSave.parentNode.replaceChild(newVSave, vSave);

        newVSave.addEventListener('click', async () => {
            if (!vDrop.classList.contains('has-file') || vInput.files.length === 0) return;

            newVSave.innerText = "上傳中...";
            newVSave.disabled = true;

            try {
                const formData = new FormData();
                formData.append("file", vInput.files[0]);
                const res = await fetch(`${API_BASE_URL}/assets/${assetId}/versions`, {
                    method: 'POST',
                    headers: api.getHeaders(true),
                    body: formData
                });
                if(!res.ok) throw new Error("版本上傳失敗");

                const icon = vList.querySelector('.status-icon');
                if (icon) icon.src = 'static/image/checkmark_fill_grey.png';

                setTimeout(() => {
                    closeV();
                    showToast('新版本上傳成功！');
                    setTimeout(() => location.reload(), 500); 
                }, 600);

            } catch (error) {
                alert("錯誤: " + error.message);
                newVSave.innerText = "上傳";
                newVSave.disabled = false;
            }
        });
    }
}

// 8. 版本還原 (Restore Modal)
const restoreModal = document.getElementById('restore-modal');
const confirmRestoreBtn = document.getElementById('confirm-restore-btn');
const cancelRestoreBtn = document.getElementById('cancel-restore-btn');
const restoreVerNameSpan = document.getElementById('restore-ver-name');
const newVerNameSpan = document.getElementById('new-ver-name');
let restoreTargetBtn = null;

// 全域版本選擇函式
window.selectVersion = function(clickedBtn) {
    const allBtns = Array.from(document.querySelectorAll('.version-btn'));
    const index = allBtns.indexOf(clickedBtn);

    if (index === 0) {
        allBtns.forEach(btn => { btn.classList.remove('active'); btn.classList.add('inactive'); });
        clickedBtn.classList.remove('inactive');
        clickedBtn.classList.add('active');
    } else {
        restoreTargetBtn = clickedBtn;
        const oldVerName = clickedBtn.querySelectorAll('span')[1].innerText;
        if(restoreVerNameSpan) restoreVerNameSpan.innerText = oldVerName;
        const nextVer = allBtns.length + 1;
        if(newVerNameSpan) newVerNameSpan.innerText = "Version_" + nextVer;
        if(restoreModal) restoreModal.style.display = 'flex';
    }
}

if(cancelRestoreBtn) cancelRestoreBtn.addEventListener('click', () => { if(restoreModal) restoreModal.style.display = 'none'; });
if(confirmRestoreBtn) confirmRestoreBtn.addEventListener('click', () => {
    if(restoreModal) restoreModal.style.display = 'none';
    showToast('已還原並建立新版本！(模擬)');
    setTimeout(() => location.reload(), 1000);
});