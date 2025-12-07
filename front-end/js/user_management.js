import { API_BASE_URL, api } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    api.checkLogin();
    loadUsers();
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
        alert("讀取失敗: " + error.message);
    }
}

function renderUserTable(users) {
    const tbody = document.querySelector('.audit-table tbody');
    tbody.innerHTML = ''; // 清空假資料

    users.forEach(user => {
        // 判斷角色 (假設 1=Admin, 2=Editor, 3=Viewer)
        let roleName = "Viewer";
        let roleValue = "viewer";
        
        if (user.role_id === 1) { roleName = "Admin"; roleValue = "admin"; }
        else if (user.role_id === 2) { roleName = "Editor"; roleValue = "editor"; }

        const tr = document.createElement('tr');
        tr.className = 'data-row';
        // 注意：這裡將原本的「最近登入」改為 Email 顯示，比較實用
        tr.innerHTML = `
            <td data-label="ID">#${user.user_id}</td>
            <td data-label="姓名">${user.user_name || '未設定'}</td>
            <td data-label="角色">
                <select class="role-select" disabled>
                    <option selected>${roleName}</option>
                </select>
            </td>
            <td data-label="Email">${user.email}</td>
            <td data-label="操作">
                <div class="action-icons">
                    <button class="action-icon delete-btn" title="刪除">
                        <img src="static/image/trash.png" class="icon-img">
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}