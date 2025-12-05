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

// 4. 分享彈窗 (Share Modal)
const shareOption = document.getElementById('share-option');
const shareModal = document.getElementById('share-modal');
const closeShareX = document.getElementById('close-share-x');

if(shareOption) {
    shareOption.addEventListener('click', () => { dropdownMenu.classList.remove('show'); shareModal.style.display = 'flex'; });
    const closeShare = () => shareModal.style.display = 'none';
    closeShareX.addEventListener('click', closeShare);
    shareModal.addEventListener('click', (e) => { if (e.target === shareModal) closeShare(); });
}

// 5. 編輯彈窗 (Edit Modal)
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
        inputFilename.value = displayFilename.innerText;
        inputId.value = displayId.innerText;
        inputTags.value = displayTags.innerText;
        editModal.style.display = 'flex';
    });

    const closeEdit = () => editModal.style.display = 'none';
    if(closeEditX) closeEditX.addEventListener('click', closeEdit);
    if(cancelEditBtn) cancelEditBtn.addEventListener('click', closeEdit);
    if(editModal) editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEdit(); });

    if(saveEditBtn) saveEditBtn.addEventListener('click', () => {
        displayFilename.innerText = inputFilename.value;
        displayId.innerText = inputId.value;
        displayTags.innerText = inputTags.value;
        closeEdit();
        showToast('修改已儲存！');
    });
}

// 6. 上傳新版本 (New Version Modal)
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
    vFileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) showVersionFile(e.target.files[0].name); });

    function showVersionFile(name) {
        vDropZone.classList.add('has-file');
        vEmptyState.style.display = 'none';
        vFileList.style.display = 'block';
        vFileList.innerHTML = `<div class="file-list-item"><div class="file-info-left"><img src="static/images/checkmark_gray.png" class="check-icon" alt="Check"><span class="file-name-text">${name}</span></div></div>`;
    }

    function resetVersionModal() {
        vDropZone.classList.remove('has-file');
        vEmptyState.style.display = 'flex';
        vFileList.style.display = 'none';
        vFileList.innerHTML = '';
        vFileInput.value = '';
    }

    saveVersionBtn.addEventListener('click', () => {
        if (!vDropZone.classList.contains('has-file')) return;

        const today = new Date();
        const dateStr = today.getFullYear() + '.' + (today.getMonth()+1).toString().padStart(2, '0') + '.' + today.getDate().toString().padStart(2, '0');
        const count = document.querySelectorAll('.version-btn').length + 1;
        const newVerName = "Version_" + count;

        const newBtn = document.createElement('div');
        newBtn.className = 'version-btn inactive';
        newBtn.onclick = function() { selectVersion(this); };
        newBtn.innerHTML = `<span>${dateStr}</span><span>${newVerName}</span>`;

        versionScrollList.insertBefore(newBtn, versionScrollList.firstChild);

        closeVersion();
        showToast('新版本上傳成功！');
        selectVersion(newBtn);
    });

    // Drag & Drop for Version
    vDropZone.addEventListener('dragover', (e) => { e.preventDefault(); vDropZone.style.borderColor = '#666'; });
    vDropZone.addEventListener('dragleave', (e) => { e.preventDefault(); vDropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; });
    vDropZone.addEventListener('drop', (e) => { e.preventDefault(); vDropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; if (e.dataTransfer.files.length > 0) showVersionFile(e.dataTransfer.files[0].name); });
}