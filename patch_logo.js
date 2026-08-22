const fs = require('fs');

// Patch index.html
let indexHtml = fs.readFileSync('index.html', 'utf8');

const oldIndexLogo = '<h1 class="inicio-banner-title">SENAIVEST</h1>';
const newIndexLogo = '<img src="assets/logo.png" alt="SENAIVEST" style="height: 150px; filter: brightness(0) invert(1); clip-path: inset(0 0 33% 0); margin-bottom: -45px; display: block; margin-left: auto; margin-right: auto;">';

if (indexHtml.includes(oldIndexLogo)) {
    indexHtml = indexHtml.replace(oldIndexLogo, newIndexLogo);
    fs.writeFileSync('index.html', indexHtml);
    console.log('index.html patched with new white logo!');
}

// Patch install.html
let installHtml = fs.readFileSync('install.html', 'utf8');

const oldInstallHeader = `<a href="index.html" class="header-logo">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            SENAI APP
        </a>`;
        
const newInstallHeader = `<a href="index.html" class="header-logo" style="gap: 12px; align-items: center;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-top: -10px;">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <img src="assets/logo.png" alt="SENAIVEST" style="height: 45px; filter: brightness(0) invert(1); clip-path: inset(0 0 33% 0); margin-bottom: -15px;">
        </a>`;

if (installHtml.includes('SENAI APP')) {
    installHtml = installHtml.replace(oldInstallHeader, newInstallHeader);
}

const oldInstallIcon = '<img src="assets/favicon.png" alt="Senaivest Icon" class="app-icon">';
const newInstallIcon = `<div class="app-icon" style="display: flex; align-items: flex-start; justify-content: center; overflow: hidden; padding: 0;">
                <img src="assets/logo.png" alt="Senaivest Icon" style="width: 140%; height: auto; filter: brightness(0) invert(1); margin-top: 5px;">
            </div>`;

if (installHtml.includes(oldInstallIcon)) {
    installHtml = installHtml.replace(oldInstallIcon, newInstallIcon);
}

fs.writeFileSync('install.html', installHtml);
console.log('install.html patched with new white logo!');

// CREATE ROBOTS.TXT AND SITEMAP.XML FOR SEO
const robotsTxt = `User-agent: *
Allow: /
Sitemap: https://senaivest.onrender.com/sitemap.xml
`;
fs.writeFileSync('robots.txt', robotsTxt);

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
   <url>
      <loc>https://senaivest.onrender.com/</loc>
      <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
   </url>
   <url>
      <loc>https://senaivest.onrender.com/install.html</loc>
      <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
   </url>
</urlset>`;
fs.writeFileSync('sitemap.xml', sitemapXml);
console.log('SEO files created!');
