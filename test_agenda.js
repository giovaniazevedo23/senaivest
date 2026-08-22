const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    const filePath = 'file://' + __dirname.replace(/\\/g, '/') + '/index.html';
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    console.log('Switching to agenda tab...');
    await page.evaluate(() => {
        if (typeof switchTab === 'function') switchTab('agenda');
    });
    const stats = await page.evaluate(() => {
        const a = document.getElementById('agenda');
        if (!a) return null;
        const r = a.getBoundingClientRect();
        return { w: r.width, h: r.height, display: window.getComputedStyle(a).display };
    });
    console.log('Agenda stats:', stats);
    await browser.close();
})();
