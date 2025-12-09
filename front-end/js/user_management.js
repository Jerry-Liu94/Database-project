/* js/user_management.js */
import { API_BASE_URL, api } from './config.js';

let targetUserId = null;

document.addEventListener('DOMContentLoaded', () => {
    api.checkLogin();
    loadUsers();
    setupModalEvents();
    setupAddUserModal();
});

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/`, {
            method: 'GET',
            headers: api.getHeaders()
        });

        if (!response.ok) throw new Error("無法讀取使用者列表");

        const users = await response.json();
        renderUserTable(users);

    } catch (error) {
        console.error(error);
    }
}

// js/user_management.js

// ★★★ 修改重點：只顯示真實資料，移除假欄位與功能 ★★★
function renderUserTable(users) {
    const tbody = document.querySelector('.audit-table tbody');
    tbody.innerHTML = ''; 

    users.forEach(user => {
        // 判斷該選哪一個 Role
        const isSelected = (val) => user.role_id === val ? 'selected' : '';

        const tr = document.createElement('tr');
        tr.className = 'data-row';
        
        tr.innerHTML = `
            <td data-label="ID">#${user.user_id}</td>
            <td data-label="姓名">${user.user_name || '未設定'}</td>
            <td data-label="角色">
                <select class="role-select" data-userid="${user.user_id}">
                    <option value="1" ${isSelected(1)}>Admin</option>
                    <option value="2" ${isSelected(2)}>User</option>
                </select>
            </td>
            <td data-label="帳號">${user.email}</td> 
            
            <td data-label="操作">
                <div class="action-icons">
                    <button class="action-icon delete-btn" title="刪除使用者">
                        <img src="static/image/trash.png" alt="刪除" class="icon-img">
                    </button>
                </div>
            </td>
        `;
        
        // 1. 綁定刪除按鈕
        const deleteBtn = tr.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            openConfirmModal(user.user_id, user.user_name);
        });

        // 2. 綁定角色切換事件
        const roleSelect = tr.querySelector('.role-select');
        roleSelect.addEventListener('change', async (e) => {
            const newRoleId = e.target.value;
            const targetId = e.target.getAttribute('data-userid');
            
            // 暫時鎖定選單避免重複操作
            roleSelect.disabled = true;

            try {
                const response = await fetch(`${API_BASE_URL}/admin/users/${targetId}/role`, {
                    method: 'PATCH',
                    headers: api.getHeaders(),
                    body: JSON.stringify({ role_id: parseInt(newRoleId) })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.detail || "更新失敗");
                }

                const roleText = parseInt(newRoleId) === 1 ? "Admin" : "User";

                alert(`✅ 角色已更新為 ${roleText}`);

            } catch (error) {
                alert("❌ 錯誤: " + error.message);
                // 失敗時，重新整理頁面以恢復原本的選項 (避免畫面跟資料庫不同步)
                loadUsers(); 
            } finally {
                roleSelect.disabled = false;
            }
        });

        tbody.appendChild(tr);
    });
}

// 輔助函式：格式化時間 (如果你的代碼裡還沒有這個)
function formatDate(isoString) {
    if (!isoString) return "--";
    const date = new Date(isoString);
    return date.toLocaleString('zh-TW', { hour12: false });
}

// --- 彈窗與刪除邏輯 (維持不變) ---
function openConfirmModal(userId, userName) {
    targetUserId = userId;
    const modal = document.getElementById('confirm-modal');
    const title = modal.querySelector('.modal-title');
    title.innerText = `確定要刪除使用者 "${userName}" 嗎？`;
    title.style.color = "#d93025";
    modal.classList.remove('hidden');
}

function setupModalEvents() {
    const modal = document.getElementById('confirm-modal');
    const confirmBtn = modal.querySelector('.modal-confirm-btn');
    const cancelBtn = modal.querySelector('.modal-cancel-btn');

    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        targetUserId = null;
    });

    confirmBtn.addEventListener('click', async () => {
        if (!targetUserId) return;
        confirmBtn.innerText = "刪除中...";
        confirmBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/users/${targetUserId}`, {
                method: 'DELETE',
                headers: api.getHeaders()
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "刪除失敗");
            }

            alert("✅ 使用者已刪除");
            modal.classList.add('hidden');
            loadUsers(); 

        } catch (error) {
            alert("❌ 錯誤: " + error.message);
        } finally {
            confirmBtn.innerText = "確認";
            confirmBtn.disabled = false;
            targetUserId = null;
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
}

// --- 新增使用者彈窗邏輯 (維持不變) ---
function setupAddUserModal() {
    const addUserBtn = document.querySelector('.add-user-btn');
    const modal = document.getElementById('user-modal');
    const confirmBtn = document.getElementById('modal-confirm-add');
    const cancelBtn = document.getElementById('modal-cancel-add');

    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            document.getElementById('new-user-name').value = '';
            document.getElementById('new-user-email').value = '';
            document.getElementById('new-user-password').value = '';
            modal.classList.remove('hidden');
        });
    }

    const closeModal = () => modal.classList.add('hidden');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const name = document.getElementById('new-user-name').value;
            const email = document.getElementById('new-user-email').value;
            const password = document.getElementById('new-user-password').value;
            const roleId = document.getElementById('new-user-role').value;

            if (!name || !email || !password) {
                alert("請填寫所有欄位");
                return;
            }

            confirmBtn.innerText = "處理中...";
            confirmBtn.disabled = true;

            try {
                const response = await fetch(`${API_BASE_URL}/admin/users/`, {
                    method: 'POST',
                    headers: api.getHeaders(),
                    body: JSON.stringify({
                        user_name: name,
                        email: email,
                        password: password,
                        role_id: parseInt(roleId)
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.detail || "新增失敗");
                }

                alert(`🎉 使用者 ${name} 新增成功！`);
                closeModal();
                loadUsers();

            } catch (error) {
                alert("錯誤: " + error.message);
            } finally {
                confirmBtn.innerText = "確認新增";
                confirmBtn.disabled = false;
            }
        });
    }
}