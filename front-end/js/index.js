/* js/index.js */
import { API_BASE_URL, api } from './config.js';

// --- 核心變數 ---
let currentFilter = 'all'; 
let currentType = 'category'; 
let activeTags = new Set();
let showFavoritesOnly = false;

// --- 初始化 ---
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
        
        // 1. 渲染中間的資產卡片
        renderApiAssets(assets);
        
        // 2. [新增] 渲染側邊欄的 AI 標籤
        renderSidebarTags(assets);

    } catch (error) {
        console.error(error);
        if (error.message.includes('401') || error.status === 401) {
            alert("連線逾時，請重新登入");
            window.location.href = "login.html";
        }
    }
}

// --- [新增] 渲染側邊欄標籤 ---
function renderSidebarTags(assets) {
    const container = document.getElementById('sidebar-tags'); // 記得 HTML 要加 id="sidebar-tags"
    if (!container) return; // 如果找不到容器(例如在別頁)就不執行

    container.innerHTML = ''; // 清空舊標籤

    // 1. 收集所有出現過的標籤 (使用 Set 去除重複)
    const uniqueTags = new Set();
    
    assets.forEach(asset => {
        if (asset.tags && Array.isArray(asset.tags)) {
            asset.tags.forEach(tagObj => {
                // 假設後端回傳結構是 { tag_name: "貓咪", ... }
                if (tagObj.tag_name) {
                    uniqueTags.add(tagObj.tag_name);
                }
            });
        }
    });

    // 2. 如果沒有任何標籤
    if (uniqueTags.size === 0) {
        container.innerHTML = '<span style="color:#999; font-size:0.9rem;">無標籤</span>';
        return;
    }

    // 3. 產生 HTML
    uniqueTags.forEach(tagName => {
        // 檢查此標籤是否在目前篩選名單中 (active-filter)
        const isActive = activeTags.has(tagName) ? 'active-filter' : '';
        
        const pill = document.createElement('span');
        pill.className = `tag-pill ${isActive}`;
        pill.innerText = `#${tagName}`;
        
        // 綁定點擊事件
        pill.onclick = function() {
            window.toggleTag(tagName, this);
        };

        container.appendChild(pill);
    });
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

    const myFavs = getLocalFavorites();

    assets.forEach(asset => {
        const thumb = asset.thumbnail_url || 'static/image/upload_grey.png'; 
        const categoryData = asset.category || "Marketing"; 
        
        // 產生標籤字串 (給篩選器用)
        const tagsList = asset.tags ? asset.tags.map(t => t.tag_name).join(',') : "";
        
        // 顯示第一個標籤
        let displayTag = "No Tag";
        if (asset.tags && asset.tags.length > 0) {
            displayTag = asset.tags[0].tag_name;
        }

        const isFav = myFavs.includes(String(asset.asset_id));
        const heartIcon = isFav ? 'static/image/heart_fill_black.png' : 'static/image/heart_black.png';
        const favAttr = isFav ? 'true' : 'false';
        
        let detailUrl = `asset_detail.html?id=${asset.asset_id}`;
        if (isFav) detailUrl += `&fav=true`;

        const cardHTML = `
            <a href="${detailUrl}" class="card" data-id="${asset.asset_id}" data-category="${categoryData}" data-tags="${tagsList}" data-favorite="${favAttr}">
                <img src="${heartIcon}" class="favorite-btn" onclick="toggleFavorite(event, this)">
                
                <div class="card-img-container">
                    <img src="${thumb}" onerror="this.src='static/image/upload_grey.png'">
                </div>

                <div class="card-title">${asset.filename}</div>
                <div class="card-tag-display">#${displayTag}</div>
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

    // 重置所有 active 樣式
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

// 4. [修改] 選擇標籤 (支援多選切換)
window.toggleTag = function(tag, element) {
    // 切換 Set 中的狀態
    if (activeTags.has(tag)) {
        activeTags.delete(tag);
        element.classList.remove('active-filter');
    } else {
        activeTags.add(tag);
        element.classList.add('active-filter');
    }
    
    // 如果有點選標籤，要清除左側「所有資產」或「類別」的 active 狀態，避免混淆
    // (這部分看需求，通常標籤是附加篩選，這裡暫保留共存)
    
    applyFilter();
}

// 5. 愛心切換
window.toggleFavorite = function(event, btn) {
    event.preventDefault(); 
    event.stopPropagation(); 

    const card = btn.closest('.card');
    const assetId = String(card.getAttribute('data-id')); 
    const isFav = card.getAttribute('data-favorite') === 'true';
    
    let currentHref = card.getAttribute('href');
    let url = new URL(currentHref, window.location.origin);
    let myFavs = getLocalFavorites();

    if (isFav) {
        card.setAttribute('data-favorite', 'false');
        btn.src = 'static/image/heart_black.png';
        url.searchParams.set('fav', 'false');
        myFavs = myFavs.filter(id => id !== assetId);
    } else {
        card.setAttribute('data-favorite', 'true');
        btn.src = 'static/image/heart_fill_black.png';
        url.searchParams.set('fav', 'true');
        if (!myFavs.includes(assetId)) myFavs.push(assetId);
    }

    const newPath = url.pathname + url.search;
    card.setAttribute('href', newPath);
    localStorage.setItem('dam_favorites', JSON.stringify(myFavs));

    if (showFavoritesOnly) applyFilter();
}

// 6. 核心篩選應用
function applyFilter() {
    const allCards = document.querySelectorAll('.card');

    allCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        // cardTags 現在是一個字串 "tag1,tag2,tag3"
        const cardTagsStr = card.getAttribute('data-tags') || ""; 
        const isFavorite = card.getAttribute('data-favorite') === 'true';
        let shouldShow = false;

        // 檢查標籤匹配 (只要 activeTags 裡面有一個標籤符合就顯示 => OR 邏輯)
        // 若要 AND 邏輯需改寫
        let tagMatch = true;
        if (activeTags.size > 0) {
            tagMatch = false;
            // 檢查卡片的 tags 是否包含 activeTags 中的任意一個
            for (let tag of activeTags) {
                if (cardTagsStr.includes(tag)) { 
                    tagMatch = true; 
                    break; 
                }
            }
        }

        if (showFavoritesOnly) {
            // 收藏模式：必須是收藏 + 標籤符合
            if (isFavorite && tagMatch) shouldShow = true;
        } else {
            // 一般模式：類別符合 + 標籤符合
            let categoryMatch = (currentFilter === 'all' || cardCategory === currentFilter);
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

if (addBtn) {
    addBtn.addEventListener('click', (e) => { 
        e.preventDefault();
        e.stopPropagation();
        modal.style.display = 'flex'; 
        resetGlobalFileState(); 
    });
    
    function closeGlobalModal() { modal.style.display = 'none'; }
    if(closeX) closeX.addEventListener('click', closeGlobalModal);
    if(cancelBtn) cancelBtn.addEventListener('click', closeGlobalModal);
    if(modal) modal.addEventListener('click', (e) => { if(e.target === modal) closeGlobalModal(); });

    if(dropZone) dropZone.addEventListener('click', () => { if(modalButtons.style.display !== 'none') fileInput.click(); });
    if(fileInput) fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleGlobalFiles(Array.from(e.target.files)); });

    function handleGlobalFiles(files) {
        if (!dropZone.classList.contains('has-file')) {
            dropZone.classList.add('has-file');
            emptyState.style.display = 'none';
            fileListContainer.style.display = 'block';
        }
        files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'file-list-item';
            item.innerHTML = `<div class="file-info-left"><img src="static/image/checkmark_grey.png" class="check-icon status-icon"><span class="file-name-text">${file.name}</span></div>`;
            fileListContainer.appendChild(item);
        });
    }

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
                    await fetch(`${API_BASE_URL}/assets/`, {
                        method: 'POST',
                        headers: api.getHeaders(true),
                        body: formData
                    });
                }

                const rows = document.querySelectorAll('.file-list-item');
                rows.forEach(row => {
                    if (!row.querySelector('.ai-tag')) {
                        const tagSpan = document.createElement('span'); tagSpan.className = 'ai-tag'; tagSpan.innerText = 'AI TAG[1]'; row.appendChild(tagSpan);
                    }
                    const icon = row.querySelector('.status-icon'); if (icon) icon.src = 'static/image/checkmark_fill_grey.png';
                });
                
                if(modalButtons) modalButtons.style.display = 'none';
                if(successMsg) successMsg.style.display = 'flex';
                
                setTimeout(() => { 
                    closeGlobalModal(); 
                    location.reload(); // 上傳後重整頁面以顯示新標籤
                }, 1500);

            } catch (error) {
                alert("上傳錯誤: " + error.message);
                newUploadBtn.innerText = "上傳";
                newUploadBtn.disabled = false;
            }
        });
    }

    function resetGlobalFileState() {
        dropZone.classList.remove('has-file'); emptyState.style.display = 'flex'; fileListContainer.style.display = 'none'; fileListContainer.innerHTML = ''; fileInput.value = '';
        if(modalButtons) modalButtons.style.display = 'flex'; 
        if(successMsg) successMsg.style.display = 'none';
        const btn = document.querySelector('.btn-upload'); 
        if(btn) { btn.innerText = "上傳"; btn.disabled = false; }
    }
    
    if(dropZone) {
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#666'; });
        dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; });
        dropZone.addEventListener('drop', (e) => { 
            e.preventDefault(); 
            dropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; 
            if (e.dataTransfer.files.length > 0 && (!modalButtons || modalButtons.style.display !== 'none')) {
                handleGlobalFiles(Array.from(e.dataTransfer.files));
            }
        });
    }
}

// Notification Sidebar
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