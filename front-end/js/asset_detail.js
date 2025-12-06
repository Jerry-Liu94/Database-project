/* js/asset_detail.js */

// 1. 版本切換邏輯
function selectVersion(clickedBtn) {
    const allBtns = document.querySelectorAll('.version-btn');
    allBtns.forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('inactive');
    });
    clickedBtn.classList.remove('inactive');
    clickedBtn.classList.add('active');
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

// 4. 愛心收藏切換邏輯
const detailHeartBtn = document.getElementById('detail-heart-btn');
let isFavorite = false;

if (detailHeartBtn) {
    detailHeartBtn.addEventListener('click', () => {
        isFavorite = !isFavorite;
        if (isFavorite) {
            detailHeartBtn.src = 'static/image/heart_fill_black.png'; // 實心
            showToast('已加入收藏');
        } else {
            detailHeartBtn.src = 'static/image/heart_black.png'; // 空心
            showToast('已取消收藏');
        }
    });
}

// 5. 分享彈窗
const shareOption = document.getElementById('share-option');
const shareModal = document.getElementById('share-modal');
const closeShareX = document.getElementById('close-share-x');

if(shareOption) {
    shareOption.addEventListener('click', () => { dropdownMenu.classList.remove('show'); shareModal.style.display = 'flex'; });
    const closeShare = () => shareModal.style.display = 'none';
    if(closeShareX) closeShareX.addEventListener('click', closeShare);
    if(shareModal) shareModal.addEventListener('click', (e) => { if (e.target === shareModal) closeShare(); });
}

// 6. 編輯彈窗
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

// 7. 上傳新版本 (修正 checkmark 邏輯)
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

    // 顯示選取檔案：使用 checkmark_grey.png (灰色空心)
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
    }

    if(saveVersionBtn) saveVersionBtn.addEventListener('click', () => {
        if (!vDropZone.classList.contains('has-file')) return;

        // 1. 上傳成功：切換為 checkmark_fill_grey.png (灰色實心)
        const icon = vFileList.querySelector('.status-icon');
        if (icon) icon.src = 'static/image/checkmark_fill_grey.png';

        // 2. 新增版本邏輯
        const today = new Date();
        const dateStr = today.getFullYear() + '.' + (today.getMonth()+1).toString().padStart(2, '0') + '.' + today.getDate().toString().padStart(2, '0');
        const count = document.querySelectorAll('.version-btn').length + 1;
        const newVerName = "Version_" + count;

        const newBtn = document.createElement('div');
        newBtn.className = 'version-btn inactive';
        newBtn.onclick = function() { selectVersion(this); };
        newBtn.innerHTML = `<span>${dateStr}</span><span>${newVerName}</span>`;

        if(versionScrollList) versionScrollList.insertBefore(newBtn, versionScrollList.firstChild);

        // 3. 延遲關閉，讓使用者看到變色效果
        setTimeout(() => {
            closeVersion();
            showToast('新版本上傳成功！');
            selectVersion(newBtn);
        }, 600);
    });

    vDropZone.addEventListener('dragover', (e) => { e.preventDefault(); vDropZone.style.borderColor = '#666'; });
    vDropZone.addEventListener('dragleave', (e) => { e.preventDefault(); vDropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; });
    vDropZone.addEventListener('drop', (e) => { 
        e.preventDefault(); 
        vDropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; 
        if (e.dataTransfer.files.length > 0) showVersionFile(e.dataTransfer.files[0].name); 
    });
}

// Notification Logic (複製過來以確保鈴鐺功能正常)
const notifyBtn = document.getElementById('notification-btn');
const notifySidebar = document.getElementById('notify-sidebar');
const notifyOverlay = document.getElementById('notify-overlay');
const closeNotifyBtn = document.getElementById('close-notify');

if (notifyBtn) {
    notifyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if(notifySidebar) notifySidebar.classList.add('show');
        if(notifyOverlay) notifyOverlay.classList.add('show');
    });
}

function closeNotification() {
    if (notifySidebar) notifySidebar.classList.remove('show');
    if (notifyOverlay) notifyOverlay.classList.remove('show');
}

if (closeNotifyBtn) closeNotifyBtn.addEventListener('click', closeNotification);
if (notifyOverlay) notifyOverlay.addEventListener('click', closeNotification);

// ==========================================
// 8. 版本還原邏輯 (Restore Version) - 重點修改
// ==========================================

const restoreModal = document.getElementById('restore-modal');
const confirmRestoreBtn = document.getElementById('confirm-restore-btn');
const cancelRestoreBtn = document.getElementById('cancel-restore-btn');
const restoreVerNameSpan = document.getElementById('restore-ver-name');
const newVerNameSpan = document.getElementById('new-ver-name');

// 這是原本 HTML 裡的 onclick="selectVersion(this)" 會呼叫的函式
// 我們這裡做修改，加入判斷
function selectVersion(clickedBtn) {
    const allBtns = Array.from(document.querySelectorAll('.version-btn'));
    const index = allBtns.indexOf(clickedBtn);

    // 邏輯判斷：
    // 如果點擊的不是第 0 個 (最新版)，且它目前不是 active 狀態
    // 就視為點擊了舊版本，觸發彈窗
    if (index > 0) {
        // 1. 取得舊版本名稱 (例如 Version_1)
        const oldVerName = clickedBtn.querySelectorAll('span')[1].innerText;
        
        // 2. 計算新版本名稱 (目前數量 + 1)
        const nextVerNum = allBtns.length + 1;
        const nextVerName = "Version_" + nextVerNum;

        // 3. 更新彈窗文字
        if(restoreVerNameSpan) restoreVerNameSpan.innerText = oldVerName;
        if(newVerNameSpan) newVerNameSpan.innerText = nextVerName;

        // 4. 顯示彈窗
        restoreModal.style.display = 'flex';
    } else {
        // 如果點擊的是最新版(第0個)，則單純切換樣式 (原本的邏輯)
        updateActiveState(clickedBtn);
    }
}

// 輔助函式：切換 Active 樣式
function updateActiveState(targetBtn) {
    const allBtns = document.querySelectorAll('.version-btn');
    allBtns.forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('inactive');
    });
    targetBtn.classList.remove('inactive');
    targetBtn.classList.add('active');
}

// --- 還原彈窗按鈕事件 ---

// 取消：關閉視窗
if(cancelRestoreBtn) {
    cancelRestoreBtn.addEventListener('click', () => {
        restoreModal.style.display = 'none';
    });
}

// 確認：執行還原 (新增一個新版本到最上方)
if(confirmRestoreBtn) {
    confirmRestoreBtn.addEventListener('click', () => {
        // 1. 準備新版本資料 (模擬今天日期)
        const today = new Date();
        const dateStr = today.getFullYear() + '.' + (today.getMonth()+1).toString().padStart(2, '0') + '.' + today.getDate().toString().padStart(2, '0');
        const count = document.querySelectorAll('.version-btn').length + 1;
        const newVerName = "Version_" + count; // 例如 Version_3

        // 2. 建立 DOM
        const newBtn = document.createElement('div');
        newBtn.className = 'version-btn inactive'; // 剛建立時先設為 inactive
        // 綁定點擊事件
        newBtn.onclick = function() { selectVersion(this); };
        newBtn.innerHTML = `<span>${dateStr}</span><span>${newVerName}</span>`;

        // 3. 插入到捲動列表的最上方 (變成最新版)
        const scrollList = document.getElementById('version-scroll-list');
        if(scrollList) {
            scrollList.insertBefore(newBtn, scrollList.firstChild);
        }

        // 4. 關閉視窗並選取新版本
        restoreModal.style.display = 'none';
        showToast('已還原並建立新版本！');
        updateActiveState(newBtn); // 讓新產生的版本變為 Active
    });
}

// 點擊遮罩關閉
if(restoreModal) {
    restoreModal.addEventListener('click', (e) => {
        if (e.target === restoreModal) restoreModal.style.display = 'none';
    });
}