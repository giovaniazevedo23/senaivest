const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const filePath = 'file://' + __dirname.replace(/\\/g, '/') + '/index.html';
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    const lastChild = await page.evaluate(() => {
        const m = document.querySelector('main.main-content');
        if (!m) return 'No main';
        const children = m.children;
        if (children.length === 0) return 'No children';
        const last = children[children.length - 1];
        return last.tagName + (last.id ? '#' + last.id : '') + (last.className ? '.' + last.className.replace(/ /g, '.') : '');
    });
    console.log('Last child of main-content:', lastChild);
    await browser.close();
})();
