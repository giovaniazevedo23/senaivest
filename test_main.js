const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const filePath = 'file://' + __dirname.replace(/\\/g, '/') + '/index.html';
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    const mainHtml = await page.evaluate(() => {
        const m = document.querySelector('main.main-content');
        return m ? m.outerHTML : '';
    });
    console.log('main-content has ' + mainHtml.split('\n').length + ' lines in the rendered DOM');
    await browser.close();
})();
