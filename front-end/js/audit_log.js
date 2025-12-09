import { API_BASE_URL, api } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    api.checkLogin();

    // 綁定匯出 CSV 按鈕
    const exportBtn = document.querySelector('.export-csv-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/admin/audit-logs/export`, {
                    method: 'GET',
                    headers: api.getHeaders(false, 'GET')
                });

                if (!response.ok) throw new Error("匯出失敗，權限不足或伺服器錯誤");

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "audit_logs.csv";
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // 載入並顯示稽核日誌
    loadAuditLogs();
});

async function loadAuditLogs(limit = 200, offset = 0) {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/audit-logs?limit=${limit}&offset=${offset}`, {
            method: 'GET',
            headers: api.getHeaders(false, 'GET')
        });

        if (!res.ok) {
            if (res.status === 403) {
                throw new Error("權限不足：僅限管理員存取稽核日誌");
            } else {
                throw new Error("讀取稽核日誌失敗");
            }
        }

        const logs = await res.json();
        renderAuditTable(logs);
    } catch (err) {
        console.error("loadAuditLogs error:", err);
        alert(err.message || "讀取稽核日誌發生錯誤");
    }
}

function renderAuditTable(logs) {
    const tbody = document.querySelector('.audit-table tbody');
    if (!tbody) return;
    tbody.innerHTML = ''; // 清空

    if (!logs || logs.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" style="text-align:center; padding:1.5rem;">目前沒有稽核日誌</td>`;
        tbody.appendChild(tr);
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement('tr');

        // 時間格式化
        const ts = log.timestamp ? new Date(log.timestamp).toLocaleString() : '';

        tr.innerHTML = `
            <td>${log.user_id ?? ''}</td>
            <td>${log.user_name ? escapeHtml(log.user_name) : ''}</td>
            <td>${escapeHtml(log.action_type ?? '')}</td>
            <td>${ts}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 簡單 escape 避免 XSS
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}