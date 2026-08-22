const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const filePath = 'file://' + __dirname.replace(/\\/g, '/') + '/index.html';
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    const parent = await page.evaluate(() => {
        const a = document.getElementById('agenda');
        return a && a.parentElement ? a.parentElement.tagName + ' ' + a.parentElement.className : 'NONE';
    });
    console.log('Parent of agenda:', parent);
    await browser.close();
})();
