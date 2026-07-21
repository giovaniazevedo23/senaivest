const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const filePath = 'file://' + __dirname.replace(/\\/g, '/') + '/index.html';
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    const hierarchy = await page.evaluate(() => {
        const a = document.getElementById('agenda');
        if (!a) return 'Not found';
        let current = a;
        let path = [];
        while (current) {
            path.push(current.tagName + (current.id ? '#' + current.id : '') + (current.className ? '.' + current.className.replace(/ /g, '.') : ''));
            current = current.parentElement;
        }
        return path.reverse().join(' > ');
    });
    console.log('Hierarchy:', hierarchy);
    await browser.close();
})();
