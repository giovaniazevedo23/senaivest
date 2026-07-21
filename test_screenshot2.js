const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    const filePath = 'file://' + __dirname.replace(/\\/g, '/') + '/index.html';
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    
    // Inject login state
    await page.evaluate(() => {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('registeredUser', JSON.stringify({
            nome: 'Test',
            email: 'test@senai.com',
            escola: 'Test School',
            avatar: 'assets/default_avatar.png'
        }));
    });
    
    // Reload to apply login
    await page.reload({ waitUntil: 'networkidle0' });
    
    // Switch to agenda
    await page.evaluate(() => {
        if (typeof switchTab === 'function') switchTab('agenda');
    });
    
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'C:\\Users\\geova\\.gemini\\antigravity-ide\\brain\\8319adc8-e32e-4317-8af0-d2620a3602da\\agenda_logged_in.png', fullPage: true });
    await browser.close();
})();
