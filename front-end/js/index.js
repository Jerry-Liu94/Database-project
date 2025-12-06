/* js/index.js */

// --- 核心變數 ---
let currentFilter = 'all'; 
let currentType = 'category'; 
let activeTags = new Set();
let showFavoritesOnly = false;

// 1. 一般篩選重置
function resetFilters(element) {
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
function filterAssets(category, element) {
    currentFilter = category;
    currentType = 'category';
    showFavoritesOnly = false;
    
    document.querySelectorAll('.menu-item, .submenu-item').forEach(el => el.classList.remove('active-filter'));
    element.classList.add('active-filter');
    applyFilter();
}

// 3. 我的收藏篩選
function filterFavorites(element) {
    showFavoritesOnly = true;
    currentFilter = 'all';    
    activeTags.clear();
    
    document.querySelectorAll('.menu-item, .submenu-item').forEach(el => el.classList.remove('active-filter'));
    document.querySelectorAll('.tag-pill').forEach(el => el.classList.remove('active-filter'));
    
    element.classList.add('active-filter');
    applyFilter();
}

// 4. 選擇標籤
function toggleTag(tag, element) {
    if (activeTags.has(tag)) {
        activeTags.delete(tag);
        element.classList.remove('active-filter');
    } else {
        activeTags.add(tag);
        element.classList.add('active-filter');
    }
    applyFilter();
}

// 5. 愛心切換邏輯 (首頁使用黑色愛心)
function toggleFavorite(event, btn) {
    event.preventDefault(); 
    event.stopPropagation(); 

    const card = btn.closest('.card');
    const isFav = card.getAttribute('data-favorite') === 'true';

    if (isFav) {
        card.setAttribute('data-favorite', 'false');
        btn.src = 'static/image/heart_black.png'; // 空心
    } else {
        card.setAttribute('data-favorite', 'true');
        btn.src = 'static/image/heart_fill_black.png'; // 實心
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
        const headerId = row.id.replace('row-', 'header-'); 
        const header = document.getElementById(headerId);
        if (visibleCards > 0) {
            row.classList.remove('hidden');
            if(header) header.style.display = 'block';
        } else {
            row.classList.add('hidden');
            if(header) header.style.display = 'none';
        }
    });
}

// 7. 側邊欄折疊
function toggleCategory() {
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

// --- 修正：補全 handleFiles 函式 ---
function handleFiles(files) {
    if (!dropZone.classList.contains('has-file')) {
        dropZone.classList.add('has-file');
        emptyState.style.display = 'none';
        fileListContainer.style.display = 'block';
    }
    files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-list-item';
        // 使用 checkmark_black.png (選取時)
        item.innerHTML = `<div class="file-info-left"><img src="static/image/checkmark_black.png" class="check-icon status-icon"><span class="file-name-text">${file.name}</span></div>`;
        fileListContainer.appendChild(item);
    });
}

// --- 修正：補全 上傳按鈕 事件 ---
if(uploadBtn) uploadBtn.addEventListener('click', () => {
    const rows = document.querySelectorAll('.file-list-item');
    if (rows.length === 0) return;
    rows.forEach(row => {
        if (!row.querySelector('.ai-tag')) {
            const tagSpan = document.createElement('span'); 
            tagSpan.className = 'ai-tag'; 
            tagSpan.innerText = 'AI TAG[1]'; 
            row.appendChild(tagSpan);
        }
        // 上傳成功後切換為 checkmark_fill_black.png
        const icon = row.querySelector('.status-icon'); 
        if (icon) icon.src = 'static/image/checkmark_fill_black.png';
    });
    modalButtons.style.display = 'none';
    successMsg.style.display = 'block';
});

function resetFileState() {
    dropZone.classList.remove('has-file'); 
    emptyState.style.display = 'flex'; 
    fileListContainer.style.display = 'none'; 
    fileListContainer.innerHTML = ''; 
    fileInput.value = '';
    modalButtons.style.display = 'flex'; 
    successMsg.style.display = 'none';
}

// --- 修正：補全 拖曳 (Drag & Drop) 事件 ---
if(dropZone) {
    dropZone.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        dropZone.style.borderColor = '#666'; 
    });
    dropZone.addEventListener('dragleave', (e) => { 
        e.preventDefault(); 
        dropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; 
    });
    dropZone.addEventListener('drop', (e) => { 
        e.preventDefault(); 
        dropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; 
        if (e.dataTransfer.files.length > 0 && modalButtons.style.display !== 'none') {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    });
}

// --- Notification Sidebar Logic (如果有加鈴鐺功能的話) ---
const notifyBtn = document.getElementById('notification-btn');
const notifySidebar = document.getElementById('notify-sidebar');
const notifyOverlay = document.getElementById('notify-overlay');
const closeNotifyBtn = document.getElementById('close-notify');

if (notifyBtn) {
    notifyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifySidebar.classList.add('show');
        notifyOverlay.classList.add('show');
    });
}

function closeNotification() {
    if (notifySidebar) notifySidebar.classList.remove('show');
    if (notifyOverlay) notifyOverlay.classList.remove('show');
}

if (closeNotifyBtn) closeNotifyBtn.addEventListener('click', closeNotification);
if (notifyOverlay) notifyOverlay.addEventListener('click', closeNotification);