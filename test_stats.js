const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    const filePath = 'file://' + __dirname.replace(/\\/g, '/') + '/index.html';
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('registeredUser', JSON.stringify({
            nome: 'Test', email: 'test@senai.com', escola: 'Test School'
        }));
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.evaluate(() => {
        if (typeof switchTab === 'function') switchTab('agenda');
    });
    await new Promise(r => setTimeout(r, 1000));
    const stats = await page.evaluate(() => {
        const a = document.getElementById('agenda');
        if (!a) return null;
        const style = window.getComputedStyle(a);
        const rect = a.getBoundingClientRect();
        
        const cc = a.querySelector('.content-container');
        const ccRect = cc ? cc.getBoundingClientRect() : null;
        const ccStyle = cc ? window.getComputedStyle(cc) : null;
        
        return {
            agenda: {
                x: rect.x, y: rect.y, w: rect.width, h: rect.height,
                opacity: style.opacity, visibility: style.visibility,
                display: style.display, zIndex: style.zIndex, transform: style.transform
            },
            cc: cc ? {
                x: ccRect.x, y: ccRect.y, w: ccRect.width, h: ccRect.height,
                opacity: ccStyle.opacity, display: ccStyle.display
            } : null
        };
    });
    console.log(JSON.stringify(stats, null, 2));
    await browser.close();
})();
