/* js/success.js */
document.addEventListener('DOMContentLoaded', () => {
    // 1. 從網址取得參數 (例如 success.html?msg=註冊成功&target=login.html)
    const params = new URLSearchParams(window.location.search);
    const msg = params.get('msg');
    const target = params.get('target') || 'index.html'; // 預設跳轉回首頁

    // 2. 如果有指定訊息，就換掉原本寫死的 "登入成功！"
    const textEl = document.querySelector('.success-text');
    if (msg && textEl) {
        textEl.innerText = msg;
    }

    // 3. 設定 1.5 秒後自動跳轉
    setTimeout(() => {
        window.location.href = target;
    }, 1500);
});