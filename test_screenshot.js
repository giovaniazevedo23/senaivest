const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    const filePath = 'file://' + __dirname.replace(/\\/g, '/') + '/index.html';
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
        if (typeof switchTab === 'function') switchTab('agenda');
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'C:\\Users\\geova\\.gemini\\antigravity-ide\\brain\\8319adc8-e32e-4317-8af0-d2620a3602da\\agenda_screenshot.png', fullPage: true });
    await browser.close();
})();
