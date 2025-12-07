import { API_BASE_URL, api } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    api.checkLogin();

    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.innerText = "匯出 CSV 報表"; // 改字比較符合後端功能
        
        searchBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/admin/audit-logs/export`, {
                    method: 'GET',
                    headers: api.getHeaders()
                });

                if (!response.ok) throw new Error("匯出失敗，權限不足？");

                // 觸發下載
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "audit_logs.csv";
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);

            } catch (error) {
                alert(error.message);
            }
        });
    }
});