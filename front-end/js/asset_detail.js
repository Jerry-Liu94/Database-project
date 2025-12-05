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
    if(closeShareX) closeShareX.addEventListener('click', closeShare);
    if(shareModal) shareModal.addEventListener('click', (e) => { if (e.target === shareModal) closeShare(); });
}

// 5. 編輯彈窗 (Edit Modal)
const editOption = document.getElementById('menu-edit-btn');
const editModal = document.getElementById('edit-modal');
const closeEditX = document.getElementById('close-edit-x');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const saveEditBtn = document.getElementById('save-edit-btn');

const displayFilename = document.getElementById('display-filename');
const displayId = document.getElementById('display-id');
// 注意：在您的 HTML 中，標籤的 ID 似乎沒有加上，建議在 HTML 中補上 id="display-tags" 讓這裡能抓到
const displayTags = document.getElementById('display-tags'); 

const inputFilename = document.getElementById('edit-filename-input');
const inputId = document.getElementById('edit-id-input');
const inputTags = document.getElementById('edit-tags-input');

if(editOption) {
    editOption.addEventListener('click', () => {
        dropdownMenu.classList.remove('show');
        if(displayFilename) inputFilename.value = displayFilename.innerText;
        if(displayId) inputId.value = displayId.innerText;
        // 這裡做個防呆，如果找不到 ID 就不填值
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

// 6. 上傳新版本 (New Version Modal) - 重點修改部分
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
    
    // 檔案選取後
    vFileInput.addEventListener('change', (e) => { 
        if (e.target.files.length > 0) showVersionFile(e.target.files[0].name); 
    });

    // 顯示檔案列表 (這裡使用 checkmark_grey.png)
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

    // 點擊上傳按鈕
    if(saveVersionBtn) saveVersionBtn.addEventListener('click', () => {
        if (!vDropZone.classList.contains('has-file')) return;

        // 1. 切換為灰色實心勾勾 (checkmark_fill_grey.png)
        const icon = vFileList.querySelector('.status-icon');
        if (icon) icon.src = 'static/image/checkmark_fill_grey.png';

        // 2. 準備新增版本資料
        const today = new Date();
        const dateStr = today.getFullYear() + '.' + (today.getMonth()+1).toString().padStart(2, '0') + '.' + today.getDate().toString().padStart(2, '0');
        const count = document.querySelectorAll('.version-btn').length + 1;
        const newVerName = "Version_" + count;

        const newBtn = document.createElement('div');
        newBtn.className = 'version-btn inactive';
        newBtn.onclick = function() { selectVersion(this); };
        newBtn.innerHTML = `<span>${dateStr}</span><span>${newVerName}</span>`;

        // 3. 插入新版本到列表頂部
        if(versionScrollList) versionScrollList.insertBefore(newBtn, versionScrollList.firstChild);

        // 4. 延遲 0.6秒 讓使用者看到勾勾變色，然後關閉視窗
        setTimeout(() => {
            closeVersion();
            showToast('新版本上傳成功！');
            selectVersion(newBtn); // 自動選取新版本
        }, 600);
    });

    // 拖曳功能
    vDropZone.addEventListener('dragover', (e) => { e.preventDefault(); vDropZone.style.borderColor = '#666'; });
    vDropZone.addEventListener('dragleave', (e) => { e.preventDefault(); vDropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; });
    vDropZone.addEventListener('drop', (e) => { 
        e.preventDefault(); 
        vDropZone.style.borderColor = 'rgba(142, 142, 142, 1)'; 
        if (e.dataTransfer.files.length > 0) showVersionFile(e.dataTransfer.files[0].name); 
    });
}