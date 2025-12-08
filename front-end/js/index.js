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

// [新增] 讀取收藏列表輔助函式
function getLocalFavorites() {
    const stored = localStorage.getItem('dam_favorites');
    return stored ? JSON.parse(stored) : [];
}

// --- API: 把後端資料畫到畫面上 (網格佈局) ---
function renderApiAssets(assets) {
    const container = document.getElementById('all-assets-container'); 
    if (!container) return; 

    container.innerHTML = ''; 

    const headerTitle = document.querySelector('.section-header');
    if(headerTitle) headerTitle.innerText = `所有資產列表 (${assets.length})`;

    if (assets.length === 0) {
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.innerHTML = '<div style="width:100%; text-align:center; color:#ccc; padding:40px; font-size:1.2rem;">目前沒有任何資產</div>';
        return;
    } else {
        container.style.display = 'grid';
    }

    // 1. 取得目前已收藏的 ID 列表
    const myFavs = getLocalFavorites();

    assets.forEach(asset => {
        const thumb = asset.thumbnail_url || 'static/image/upload_grey.png'; 
        const categoryData = asset.category || "Marketing"; 
        const tagsData = asset.filename; 

        // 2. 判斷此資產是否在收藏名單中
        const isFav = myFavs.includes(String(asset.asset_id));
        
        // 3. 設定愛心圖示與狀態
        const heartIcon = isFav ? 'static/image/heart_fill_black.png' : 'static/image/heart_black.png';
        const favAttr = isFav ? 'true' : 'false';
        
        // 4. 設定連結參數 (若已收藏，連結加上 fav=true)
        let detailUrl = `asset_detail.html?id=${asset.asset_id}`;
        if (isFav) detailUrl += `&fav=true`;

        const cardHTML = `
            <a href="${detailUrl}" class="card" data-id="${asset.asset_id}" data-category="${categoryData}" data-tags="${tagsData}" data-favorite="${favAttr}">
                <img src="${heartIcon}" class="favorite-btn" onclick="toggleFavorite(event, this)">
                
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

// 5. 愛心切換 (整合 localStorage 與 URL 參數)
window.toggleFavorite = function(event, btn) {
    event.preventDefault(); 
    event.stopPropagation(); 

    const card = btn.closest('.card');
    const assetId = String(card.getAttribute('data-id')); 
    const isFav = card.getAttribute('data-favorite') === 'true';
    
    // 處理連結參數
    let currentHref = card.getAttribute('href');
    let url = new URL(currentHref, window.location.origin);
    
    // 處理 localStorage
    let myFavs = getLocalFavorites();

    if (isFav) {
        // 取消收藏
        card.setAttribute('data-favorite', 'false');
        btn.src = 'static/image/heart_black.png';
        
        // 更新網址參數
        url.searchParams.set('fav', 'false');
        
        // 移除 Storage
        myFavs = myFavs.filter(id => id !== assetId);
    } else {
        // 加入收藏
        card.setAttribute('data-favorite', 'true');
        btn.src = 'static/image/heart_fill_black.png';
        
        // 更新網址參數
        url.searchParams.set('fav', 'true');
        
        // 加入 Storage
        if (!myFavs.includes(assetId)) myFavs.push(assetId);
    }

    // 寫回 href
    const newPath = url.pathname + url.search;
    card.setAttribute('href', newPath);

    // 寫回 localStorage
    localStorage.setItem('dam_favorites', JSON.stringify(myFavs));

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

function handleFiles(files) {
    if (!dropZone.classList.contains('has-file')) {
        dropZone.classList.add('has-file');
        emptyState.style.display = 'none';
        fileListContainer.style.display = 'block';
    }
    files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-list-item';
        // 預設灰色空心勾勾
        item.innerHTML = `<div class="file-info-left"><img src="static/image/checkmark_grey.png" class="check-icon status-icon"><span class="file-name-text">${file.name}</span></div>`;
        fileListContainer.appendChild(item);
    });
}

// 點擊上傳按鈕 (API 上傳 + 換圖示)
if(uploadBtn) {
    const newUploadBtn = uploadBtn.cloneNode(true);
    uploadBtn.parentNode.replaceChild(newUploadBtn, uploadBtn);

    newUploadBtn.addEventListener('click', async () => {
        const files = fileInput.files;
        if (files.length === 0 && document.querySelectorAll('.file-list-item').length === 0) {
            alert("請先選擇檔案");
            return;
        }

        newUploadBtn.innerText = "上傳中...";
        newUploadBtn.disabled = true;

        try {
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

            const rows = document.querySelectorAll('.file-list-item');
            rows.forEach(row => {
                if (!row.querySelector('.ai-tag')) {
                    const tagSpan = document.createElement('span'); 
                    tagSpan.className = 'ai-tag'; 
                    tagSpan.innerText = 'AI Analysis...'; 
                    row.appendChild(tagSpan);
                }
                // 切換為灰色實心勾勾
                const icon = row.querySelector('.status-icon'); 
                if (icon) icon.src = 'static/image/checkmark_fill_grey.png';
            });

            modalButtons.style.display = 'none';
            if(successMsg) successMsg.style.display = 'flex'; // 顯示含圖示的成功訊息

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
    dropZone.classList.remove('has-file'); emptyState.style.display = 'flex'; fileListContainer.style.display = 'none'; fileListContainer.innerHTML = ''; fileInput.value = '';
    modalButtons.style.display = 'flex'; successMsg.style.display = 'none';
    const btn = document.querySelector('.btn-upload'); // 重新選取新按鈕
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

// --- Notification Sidebar ---
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