/* js/index.js */
// 1. [新增] 引入設定檔
import { API_BASE_URL, api } from './config.js';

// --- 核心變數 ---
let currentFilter = 'all'; 
let currentType = 'category'; 
let activeTags = new Set();
let showFavoritesOnly = false;

// --- [新增] 初始化：檢查登入 & 載入資料 ---
document.addEventListener('DOMContentLoaded', () => {
    // 檢查是否有 Token，沒有就踢回登入頁
    api.checkLogin(); 
    
    // 載入後端資產資料
    loadAssets();     
});

// --- [新增] API: 載入資產列表 ---
async function loadAssets() {
    try {
        const response = await fetch(`${API_BASE_URL}/assets/`, {
            method: 'GET',
            headers: api.getHeaders()
        });

        if (!response.ok) throw new Error("讀取資料失敗");

        const assets = await response.json();
        renderApiAssets(assets); // 把資料畫在畫面上

    } catch (error) {
        console.error(error);
        // 如果 Token 過期 (401)，踢回登入頁
        if (error.message.includes('401') || error.status === 401) {
            alert("連線逾時，請重新登入");
            window.location.href = "login.html";
        }
    }
}

// --- [新增] API: 把後端資料畫到畫面上 ---
function renderApiAssets(assets) {
    // 我們暫時把所有資料顯示在 "Marketing" 區塊 (當作主要顯示區)
    const container = document.getElementById('row-marketing'); 
    
    // 清空原本的假資料
    container.innerHTML = ''; 
    // 清空並隱藏其他暫時用不到的區塊，避免混淆
    document.getElementById('row-social').innerHTML = ''; 
    document.getElementById('row-internal').innerHTML = '';
    
    // 修改標題顯示數量
    const header = document.getElementById('header-marketing');
    if(header) header.innerText = `所有資產 (${assets.length})`;

    // 隱藏其他標題
    const hSocial = document.getElementById('header-social');
    const hInternal = document.getElementById('header-internal');
    if(hSocial) hSocial.style.display = 'none';
    if(hInternal) hInternal.style.display = 'none';

    if (assets.length === 0) {
        container.innerHTML = '<div style="padding:20px; color:#ccc;">目前沒有任何資產</div>';
        return;
    }

    assets.forEach(asset => {
        // 判斷縮圖 (如果有 thumbnail_url 就用，沒有就用預設圖)
        // 注意：這裡預設圖路徑要對應你的專案結構
        const thumb = asset.thumbnail_url || 'static/image/upload_grey.png'; 
        
        // 設定資料屬性，讓你的篩選器 (applyFilter) 可以運作
        // 暫時將所有新上傳的歸類在 Marketing，標籤用檔名代替 (方便測試搜尋)
        const categoryData = "Marketing"; 
        const tagsData = asset.filename; 

        // 建立卡片 HTML
        const cardHTML = `
            <a href="asset_detail.html?id=${asset.asset_id}" class="card" data-category="${categoryData}" data-tags="${tagsData}" data-favorite="false">
                <img src="static/image/heart_black.png" class="favorite-btn" onclick="toggleFavorite(event, this)">
                
                <div style="width:100%; height:120px; overflow:hidden; border-radius:8px; display:flex; align-items:center; justify-content:center; background:#f0f0f0; margin-bottom:10px;">
                    <img src="${thumb}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='static/image/upload_grey.png'">
                </div>

                <div class="card-title">${asset.filename}</div>
                <div class="card-tag-display">#${asset.file_type || 'file'}</div>
                <div class="card-version">ID: ${asset.asset_id}</div>
            </a>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    });
}

// 1. 一般篩選重置 (將函式掛載到 window 以便 HTML onclick 呼叫)
window.resetFilters = function(element) {
    currentFilter = 'all';
    currentType = 'category';
    activeTags.clear();
    showFavoritesOnly = false;

    document.querySelectorAll('.menu-item, .submenu-item').forEach(el => el.classList.remove('active-filter'));
    document.querySelectorAll('.tag-pill').forEach(el => el.classList.remove('active-filter'));
    
    element.classList.add('active-filter');
    applyFilter();
}

// 2. 選擇類別
window.filterAssets = function(category, element) {
    currentFilter = category;
    currentType = 'category';
    showFavoritesOnly = false;
    
    document.querySelectorAll('.menu-item, .submenu-item').forEach(el => el.classList.remove('active-filter'));
    element.classList.add('active-filter');
    applyFilter();
}

// 3. 我的收藏篩選
window.filterFavorites = function(element) {
    showFavoritesOnly = true;
    currentFilter = 'all';    
    activeTags.clear();
    
    document.querySelectorAll('.menu-item, .submenu-item').forEach(el => el.classList.remove('active-filter'));
    document.querySelectorAll('.tag-pill').forEach(el => el.classList.remove('active-filter'));
    
    element.classList.add('active-filter');
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
    const allRows = document.querySelectorAll('.content-row');

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

    allRows.forEach((row) => {
        const visibleCards = row.querySelectorAll('.card:not(.hidden)').length;
        // 注意：這裡配合 renderApiAssets，如果該列有卡片就顯示
        if (visibleCards > 0) {
            row.classList.remove('hidden');
        } else {
            row.classList.add('hidden');
        }
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

// 8. 上傳彈窗邏輯 (整合 API)
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
        // 使用 checkmark_grey.png (未上傳狀態)
        item.innerHTML = `<div class="file-info-left"><img src="static/image/checkmark_grey.png" class="check-icon status-icon"><span class="file-name-text">${file.name}</span></div>`;
        fileListContainer.appendChild(item);
    });
}

// [修改] 點擊上傳按鈕 (呼叫 API)
if(uploadBtn) {
    // 移除舊的監聽器，改用新的 API 上傳邏輯
    const newUploadBtn = uploadBtn.cloneNode(true);
    uploadBtn.parentNode.replaceChild(newUploadBtn, uploadBtn);

    newUploadBtn.addEventListener('click', async () => {
        const files = fileInput.files;
        if (files.length === 0) {
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
                    headers: api.getHeaders(true), // true 代表上傳，不設 Content-Type
                    body: formData
                });

                if (!res.ok) throw new Error(`檔案 ${files[i].name} 上傳失敗`);
            }

            // 全部成功後，更新 UI 狀態
            const rows = document.querySelectorAll('.file-list-item');
            rows.forEach(row => {
                if (!row.querySelector('.ai-tag')) {
                    const tagSpan = document.createElement('span'); 
                    tagSpan.className = 'ai-tag'; 
                    tagSpan.innerText = 'AI Analysis...'; // 顯示 AI 分析中
                    row.appendChild(tagSpan);
                }
                // 切換為實心勾勾
                const icon = row.querySelector('.status-icon'); 
                if (icon) icon.src = 'static/image/checkmark_fill_grey.png';
            });

            modalButtons.style.display = 'none';
            successMsg.style.display = 'block';
            successMsg.innerText = "🎉 上傳成功！正在重新載入...";

            // 1.5秒後重新整理頁面以顯示新圖片
            setTimeout(() => {
                location.reload(); 
            }, 1500);

        } catch (error) {
            alert("上傳錯誤: " + error.message);
            newUploadBtn.innerText = "上傳";
            newUploadBtn.disabled = false;
        }
    });
}

function resetFileState() {
    dropZone.classList.remove('has-file'); emptyState.style.display = 'flex'; fileListContainer.style.display = 'none'; fileListContainer.innerHTML = ''; fileInput.value = '';
    modalButtons.style.display = 'flex'; successMsg.style.display = 'none';
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
            fileInput.files = e.dataTransfer.files; // 將拖曳的檔案指派給 input
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