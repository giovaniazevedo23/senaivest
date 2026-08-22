const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    const filePath = 'file://' + __dirname.replace(/\\/g, '/') + '/index.html';
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('registeredUser', JSON.stringify({nome: 'Test', email: 't@t.com'}));
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.evaluate(() => {
        if (typeof switchTab === 'function') switchTab('agenda');
    });
    await new Promise(r => setTimeout(r, 1000));
    const stats = await page.evaluate(() => {
        const results = {};
        document.querySelectorAll('body > *, .main-content > *, .app-container > *').forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.display !== 'none' && el.tagName !== 'SCRIPT') {
                const rect = el.getBoundingClientRect();
                if (rect.height > 0) {
                    results[el.id || el.className || el.tagName] = { y: rect.y, h: rect.height, display: style.display };
                }
            }
        });
        return results;
    });
    console.log(JSON.stringify(stats, null, 2));
    await browser.close();
})();
