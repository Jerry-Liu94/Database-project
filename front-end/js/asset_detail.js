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

// 4. (已移除愛心收藏功能)

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

// 7. 上傳新版本 (New Version Modal - 頁面專屬功能)
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
    }

    if(saveVersionBtn) saveVersionBtn.addEventListener('click', () => {
        if (!vDropZone.classList.contains('has-file')) return;

        // 1. 切換為灰色實心勾勾
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

// ==========================================
// 8. 全域功能：新增資產彈窗 (Global Upload Asset) - [新增部分]
// ==========================================
const addBtn = document.getElementById('add-btn');
const modal = document.getElementById('upload-modal');
const closeX = document.getElementById('close-modal-x');
const cancelBtn = document.getElementById('cancel-btn');
const uploadBtn = document.getElementById('upload-btn-action');

// 使用全域的 drop-zone ID (注意：這裡用的是 upload-modal 裡的 drop-zone，跟版本上傳的不同)
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const emptyState = document.getElementById('empty-state');
const fileListContainer = document.getElementById('file-list-container');
const modalButtons = document.querySelector('.modal-buttons'); // 這裡抓取 upload-modal 內的按鈕區
const successMsg = document.getElementById('success-msg');

if (addBtn) {
    addBtn.addEventListener('click', () => { modal.style.display = 'flex'; resetGlobalFileState(); });
    
    function closeGlobalModal() { modal.style.display = 'none'; }
    if(closeX) closeX.addEventListener('click', closeGlobalModal);
    if(cancelBtn) cancelBtn.addEventListener('click', closeGlobalModal);
    if(modal) modal.addEventListener('click', (e) => { if(e.target === modal) closeGlobalModal(); });

    dropZone.addEventListener('click', () => { 
        // 只有當按鈕還在顯示時(未上傳成功)，才允許點擊選擇檔案
        if(modalButtons.style.display !== 'none') fileInput.click(); 
    });
    
    fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleGlobalFiles(Array.from(e.target.files)); });

    function handleGlobalFiles(files) {
        if (!dropZone.classList.contains('has-file')) {
            dropZone.classList.add('has-file');
            emptyState.style.display = 'none';
            fileListContainer.style.display = 'block';
        }
        files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'file-list-item';
            // 使用黑色空心勾勾
            item.innerHTML = `<div class="file-info-left"><img src="static/image/checkmark_black.png" class="check-icon status-icon"><span class="file-name-text">${file.name}</span></div>`;
            fileListContainer.appendChild(item);
        });
    }

    if(uploadBtn) uploadBtn.addEventListener('click', () => {
        const rows = document.querySelectorAll('#file-list-container .file-list-item');
        rows.forEach(row => {
            if (!row.querySelector('.ai-tag')) {
                const tagSpan = document.createElement('span'); tagSpan.className = 'ai-tag'; tagSpan.innerText = 'AI TAG[1]'; row.appendChild(tagSpan);
            }
            // 使用黑色實心勾勾
            const icon = row.querySelector('.status-icon'); if (icon) icon.src = 'static/image/checkmark_fill_black.png';
        });
        
        // 隱藏按鈕，顯示成功訊息
        if(modalButtons) modalButtons.style.display = 'none';
        if(successMsg) successMsg.style.display = 'block';
        
        // 1.5秒後自動關閉
        setTimeout(() => { closeGlobalModal(); }, 1500);
    });

    function resetGlobalFileState() {
        dropZone.classList.remove('has-file'); 
        emptyState.style.display = 'flex'; 
        fileListContainer.style.display = 'none'; 
        fileListContainer.innerHTML = ''; 
        fileInput.value = '';
        if(modalButtons) modalButtons.style.display = 'flex'; 
        if(successMsg) successMsg.style.display = 'none';
    }
    
    // 拖曳功能
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

// 9. 版本還原邏輯 (Restore Version)
const restoreModal = document.getElementById('restore-modal');
const confirmRestoreBtn = document.getElementById('confirm-restore-btn');
const cancelRestoreBtn = document.getElementById('cancel-restore-btn');
const restoreVerNameSpan = document.getElementById('restore-ver-name');
const newVerNameSpan = document.getElementById('new-ver-name');
let targetRestoreBtn = null;

// 取代 selectVersion 的行為：舊版本點擊時觸發彈窗
const _originalSelectVersion = selectVersion; // 保存舊邏輯 (其實上面已經定義了，這裡重新綁定邏輯比較安全)

// 我們覆寫 selectVersion，讓它支援彈窗判斷
window.selectVersion = function(clickedBtn) {
    const allBtns = Array.from(document.querySelectorAll('.version-btn'));
    const index = allBtns.indexOf(clickedBtn);

    // 如果點擊的是最新的 (index 0) -> 直接切換
    if (index === 0) {
        // 呼叫原本的切換樣式邏輯
        allBtns.forEach(btn => {
            btn.classList.remove('active');
            btn.classList.add('inactive');
        });
        clickedBtn.classList.remove('inactive');
        clickedBtn.classList.add('active');
    } else {
        // 如果是舊版本 -> 開啟還原確認窗
        targetRestoreBtn = clickedBtn;
        
        // 抓取版本名稱 (假設結構是 <span>Date</span><span>Name</span>)
        const oldVerName = clickedBtn.querySelectorAll('span')[1].innerText;
        const nextVerNum = allBtns.length + 1;
        const nextVerName = "Version_" + nextVerNum;

        if(restoreVerNameSpan) restoreVerNameSpan.innerText = oldVerName;
        if(newVerNameSpan) newVerNameSpan.innerText = nextVerName;

        if(restoreModal) restoreModal.style.display = 'flex';
    }
}

if(cancelRestoreBtn) {
    cancelRestoreBtn.addEventListener('click', () => {
        if(restoreModal) restoreModal.style.display = 'none';
    });
}

if(confirmRestoreBtn) {
    confirmRestoreBtn.addEventListener('click', () => {
        const today = new Date();
        const dateStr = today.getFullYear() + '.' + (today.getMonth()+1).toString().padStart(2, '0') + '.' + today.getDate().toString().padStart(2, '0');
        const count = document.querySelectorAll('.version-btn').length + 1;
        const newVerName = "Version_" + count;

        const newBtn = document.createElement('div');
        newBtn.className = 'version-btn inactive';
        newBtn.onclick = function() { selectVersion(this); };
        newBtn.innerHTML = `<span>${dateStr}</span><span>${newVerName}</span>`;

        if(versionScrollList) versionScrollList.insertBefore(newBtn, versionScrollList.firstChild);

        if(restoreModal) restoreModal.style.display = 'none';
        showToast('已還原並建立新版本！');
        
        // 選取最新的
        const allBtns = document.querySelectorAll('.version-btn');
        allBtns.forEach(btn => {
            btn.classList.remove('active');
            btn.classList.add('inactive');
        });
        newBtn.classList.remove('inactive');
        newBtn.classList.add('active');
    });
}