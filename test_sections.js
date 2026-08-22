const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const filePath = 'file://' + __dirname.replace(/\\/g, '/') + '/index.html';
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    const parents = await page.evaluate(() => {
        const results = {};
        document.querySelectorAll('section').forEach(s => {
            results[s.id || s.className] = s.parentElement ? s.parentElement.tagName : 'NONE';
        });
        return results;
    });
    console.log(JSON.stringify(parents, null, 2));
    await browser.close();
})();
