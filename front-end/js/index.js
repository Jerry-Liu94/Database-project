/* js/index.js */
import { API_BASE_URL, api } from './config.js';

// --- 核心變數 ---
let currentFilter = 'all'; 
let currentType = 'category'; 
let activeTags = new Set();
let showFavoritesOnly = false;

// --- 初始化：檢查登入 & 載入資料 ---
document.addEventListener('DOMContentLoaded', () => {
    api.checkLogin(); 
    loadAssets();     
});

// --- API: 載入資產列表 ---
async function loadAssets() {
    try {
        const response = await fetch(`${API_BASE_URL}/assets/`, {
            method: 'GET',
            headers: api.getHeaders()
        });

        if (!response.ok) throw new Error("讀取資料失敗");

        const assets = await response.json();
        renderApiAssets(assets);

    } catch (error) {
        console.error(error);
        if (error.message.includes('401') || error.status === 401) {
            alert("連線逾時，請重新登入");
            window.location.href = "login.html";
        }
    }
}

// --- API: 把後端資料畫到畫面上 (網格佈局) ---
function renderApiAssets(assets) {
    const container = document.getElementById('all-assets-container'); 
    if (!container) return; 

    container.innerHTML = ''; 

    const headerTitle = document.querySelector('.section-header');
    if(headerTitle) headerTitle.innerText = `所有資產列表 (${assets.length})`;

    if (assets.length === 0) {
        // 無資料時，讓提示文字置中
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.innerHTML = '<div style="width:100%; text-align:center; color:#ccc; padding:40px; font-size:1.2rem;">目前沒有任何資產</div>';
        return;
    } else {
        // 有資料時恢復 Grid
        container.style.display = 'grid';
    }

    assets.forEach(asset => {
        const thumb = asset.thumbnail_url || 'static/image/upload_grey.png'; 
        const categoryData = asset.category || "Marketing"; 
        const tagsData = asset.filename; 

        const cardHTML = `
            <a href="asset_detail.html?id=${asset.asset_id}" class="card" data-category="${categoryData}" data-tags="${tagsData}" data-favorite="false">
                <img src="static/image/heart_black.png" class="favorite-btn" onclick="toggleFavorite(event, this)">
                
                <div class="card-img-container">
                    <img src="${thumb}" onerror="this.src='static/image/upload_grey.png'">
                </div>

                <div class="card-title">${asset.filename}</div>
                <div class="card-tag-display">#${asset.file_type || 'AI Tag'}</div>
                <div class="card-version">ID: ${asset.asset_id}</div>
            </a>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    });
}

// 1. 一般篩選重置
window.resetFilters = function(element) {
    currentFilter = 'all';
    currentType = 'category';
    activeTags.clear();
    showFavoritesOnly = false;

    document.querySelectorAll('.menu-item, .submenu-item').forEach(el => el.classList.remove('active-filter'));
    document.querySelectorAll('.tag-pill').forEach(el => el.classList.remove('active-filter'));
    
    if(element) element.classList.add('active-filter');
    applyFilter();
}

// 2. 選擇類別
window.filterAssets = function(category, element) {
    currentFilter = category;
    currentType = 'category';
    showFavoritesOnly = false;
    
    document.querySelectorAll('.menu-item, .submenu-item').forEach(el => el.classList.remove('active-filter'));
    if(element) element.classList.add('active-filter');
    applyFilter();
}

// 3. 我的收藏篩選
window.filterFavorites = function(element) {
    showFavoritesOnly = true;
    currentFilter = 'all';    
    activeTags.clear();
    
    document.querySelectorAll('.menu-item, .submenu-item').forEach(el => el.classList.remove('active-filter'));
    document.querySelectorAll('.tag-pill').forEach(el => el.classList.remove('active-filter'));
    
    if(element) element.classList.add('active-filter');
    applyFilter();
}

// 4. 選擇標籤
window.toggleTag = function(tag, element) {
    if (activeTags.has(tag)) {
        activeTags.delete(tag);
        element.classList.remove('active-filter');
    } else {
        activeTags.add(tag);
        element.classList.add('active-filter');
    }
    applyFilter();
}

// 5. 愛心切換
window.toggleFavorite = function(event, btn) {
    event.preventDefault(); 
    event.stopPropagation(); 

    const card = btn.closest('.card');
    const isFav = card.getAttribute('data-favorite') === 'true';

    if (isFav) {
        card.setAttribute('data-favorite', 'false');
        btn.src = 'static/image/heart_black.png';
    } else {
        card.setAttribute('data-favorite', 'true');
        btn.src = 'static/image/heart_fill_black.png';
    }

    if (showFavoritesOnly) applyFilter();
}

// 6. 核心篩選應用
function applyFilter() {
    const allCards = document.querySelectorAll('.card');

    allCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        const cardTags = card.getAttribute('data-tags');
        const isFavorite = card.getAttribute('data-favorite') === 'true';
        let shouldShow = false;

        if (showFavoritesOnly) {
            if (isFavorite) {
                if (activeTags.size > 0) {
                    for (let tag of activeTags) {
                        if (cardTags && cardTags.includes(tag)) { shouldShow = true; break; }
                    }
                } else {
                    shouldShow = true;
                }
            }
        } else {
            let categoryMatch = (currentFilter === 'all' || cardCategory === currentFilter);
            let tagMatch = true;
            if (activeTags.size > 0) {
                tagMatch = false;
                for (let tag of activeTags) {
                    if (cardTags && cardTags.includes(tag)) { tagMatch = true; break; }
                }
            }
            if (categoryMatch && tagMatch) shouldShow = true;
        }

        if (shouldShow) card.classList.remove('hidden');
        else card.classList.add('hidden');
    });
}

// 7. 側邊欄折疊
window.toggleCategory = function() {
    const submenu = document.getElementById('category-submenu');
    const chevron = document.getElementById('category-chevron');
    const menuItem = chevron.parentElement;
    menuItem.classList.toggle('active');
    if (submenu.style.maxHeight) submenu.style.maxHeight = null;
    else submenu.style.maxHeight = submenu.scrollHeight + "px";
}

// 8. 上傳彈窗邏輯
const addBtn = document.getElementById('add-btn');
const modal = document.getElementById('upload-modal');
const closeX = document.getElementById('close-modal-x');
const cancelBtn = document.getElementById('cancel-btn');
const uploadBtn = document.getElementById('upload-btn-action');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const emptyState = document.getElementById('empty-state');
const fileListContainer = document.getElementById('file-list-container');
const modalButtons = document.querySelector('.modal-buttons');
const successMsg = document.getElementById('success-msg');

if (addBtn) addBtn.addEventListener('click', () => { modal.style.display = 'flex'; resetFileState(); });

function closeModal() { modal.style.display = 'none'; }
if(closeX) closeX.addEventListener('click', closeModal);
if(cancelBtn) cancelBtn.addEventListener('click', closeModal);
if(modal) modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });

if(dropZone) dropZone.addEventListener('click', () => { if(modalButtons.style.display !== 'none') fileInput.click(); });
if(fileInput) fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFiles(Array.from(e.target.files)); });

// [修改] 處理檔案顯示：使用 checkmark_grey.png (空心)
function handleFiles(files) {
    if (!dropZone.classList.contains('has-file')) {
        dropZone.classList.add('has-file');
        emptyState.style.display = 'none';
        fileListContainer.style.display = 'block';
    }
    files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-list-item';
        
        item.innerHTML = `
            <div class="file-info-left">
                <img src="static/image/checkmark_grey.png" class="check-icon status-icon" alt="status">
                <span class="file-name-text">${file.name}</span>
            </div>`;
            
        fileListContainer.appendChild(item);
    });
}

// [修改] 點擊上傳按鈕 (API 上傳 + 切換圖示)
if(uploadBtn) {
    const newUploadBtn = uploadBtn.cloneNode(true);
    uploadBtn.parentNode.replaceChild(newUploadBtn, uploadBtn);

    newUploadBtn.addEventListener('click', async () => {
        const files = fileInput.files;
        // 如果 input 沒有檔案，檢查是否有拖曳進來的檔案顯示在 UI 上 (這裡僅做簡易檢查)
        if (files.length === 0 && document.querySelectorAll('.file-list-item').length === 0) {
            alert("請先選擇檔案");
            return;
        }

        newUploadBtn.innerText = "上傳中...";
        newUploadBtn.disabled = true;

        try {
            // 迴圈上傳每一個檔案
            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                formData.append('file', files[i]);

                const res = await fetch(`${API_BASE_URL}/assets/`, {
                    method: 'POST',
                    headers: api.getHeaders(true),
                    body: formData
                });

                if (!res.ok) throw new Error(`檔案 ${files[i].name} 上傳失敗`);
            }

            // 全部成功後，更新 UI 圖示
            const rows = document.querySelectorAll('.file-list-item');
            rows.forEach(row => {
                if (!row.querySelector('.ai-tag')) {
                    const tagSpan = document.createElement('span'); 
                    tagSpan.className = 'ai-tag'; 
                    tagSpan.innerText = 'AI Analysis...'; 
                    row.appendChild(tagSpan);
                }
                
                // [關鍵修改] 上傳成功，切換為 checkmark_fill_grey.png (實心灰色勾勾)
                // 注意：請確保您的圖片檔名是 grey 或 gray，這裡使用 grey
                const icon = row.querySelector('.status-icon'); 
                if (icon) icon.src = 'static/image/checkmark_fill_grey.png';
            });

            // 隱藏按鈕，顯示成功訊息 (成功訊息內已有綠色勾勾或圖片)
            modalButtons.style.display = 'none';
            // 使用 flex 讓圖文置中
            if(successMsg) successMsg.style.display = 'flex'; 

            // 1.5秒後重新整理頁面
            setTimeout(() => {
                location.reload(); 
            }, 1500);

        } catch (error) {
            console.error(error);
            alert("上傳錯誤: " + error.message);
            newUploadBtn.innerText = "上傳";
            newUploadBtn.disabled = false;
        }
    });
}

function resetFileState() {
    dropZone.classList.remove('has-file'); 
    emptyState.style.display = 'flex'; 
    fileListContainer.style.display = 'none'; 
    fileListContainer.innerHTML = ''; 
    fileInput.value = '';
    
    // 重置按鈕與訊息
    if(modalButtons) modalButtons.style.display = 'flex'; 
    if(successMsg) successMsg.style.display = 'none';
    
    // 重置按鈕文字
    const btn = document.querySelector('.btn-upload');
    if(btn) { btn.innerText = "上傳"; btn.disabled = false; }
}

if(dropZone) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#666'; });
    dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; });
    dropZone.addEventListener('drop', (e) => { 
        e.preventDefault(); 
        dropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; 
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            if(modalButtons.style.display !== 'none') handleFiles(Array.from(e.dataTransfer.files));
        }
    });
}

// --- Notification Sidebar Logic ---
const notifyBtn = document.getElementById('notification-btn');
const notifySidebar = document.getElementById('notify-sidebar');
const notifyOverlay = document.getElementById('notify-overlay');
const closeNotifyBtn = document.getElementById('close-notify');

if (notifyBtn && notifySidebar) {
    notifyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifySidebar.classList.add('show');
        if(notifyOverlay) notifyOverlay.classList.add('show');
    });
}

function closeNotification() {
    if (notifySidebar) notifySidebar.classList.remove('show');
    if (notifyOverlay) notifyOverlay.classList.remove('show');
}

if (closeNotifyBtn) closeNotifyBtn.addEventListener('click', closeNotification);
if (notifyOverlay) notifyOverlay.addEventListener('click', closeNotification);