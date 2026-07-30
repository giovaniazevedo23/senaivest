const fs = require('fs');

// Patch index.html
let indexHtml = fs.readFileSync('index.html', 'utf8');

const oldIndexLogo = '<img src="assets/logo.png" alt="SENAIVEST" style="height: 150px; filter: brightness(0) invert(1); clip-path: inset(0 0 33% 0); margin-bottom: -45px; display: block; margin-left: auto; margin-right: auto;">';
const newIndexLogo = '<img src="assets/logo.png" alt="SENAIVEST" style="height: 120px; display: block; margin-left: auto; margin-right: auto;">';

if (indexHtml.includes(oldIndexLogo)) {
    indexHtml = indexHtml.replace(oldIndexLogo, newIndexLogo);
    fs.writeFileSync('index.html', indexHtml);
    console.log('index.html logo restored!');
} else {
    console.log('oldIndexLogo not found in index.html');
}

// Patch install.html
let installHtml = fs.readFileSync('install.html', 'utf8');

const oldInstallHeader = `<a href="index.html" class="header-logo" style="gap: 12px; align-items: center;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-top: -10px;">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <img src="assets/logo.png" alt="SENAIVEST" style="height: 45px; filter: brightness(0) invert(1); clip-path: inset(0 0 33% 0); margin-bottom: -15px;">
        </a>`;
        
const newInstallHeader = `<a href="index.html" class="header-logo" style="gap: 12px; align-items: center;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <img src="assets/logo.png" alt="SENAIVEST" style="height: 40px;">
        </a>`;

if (installHtml.includes(oldInstallHeader)) {
    installHtml = installHtml.replace(oldInstallHeader, newInstallHeader);
    console.log('install.html header restored!');
} else {
    console.log('oldInstallHeader not found');
}

const oldInstallIcon = `<div class="app-icon" style="display: flex; align-items: flex-start; justify-content: center; overflow: hidden; padding: 0;">
                <img src="assets/logo.png" alt="Senaivest Icon" style="width: 140%; height: auto; filter: brightness(0) invert(1); margin-top: 5px;">
            </div>`;
const newInstallIcon = `<div class="app-icon" style="display: flex; align-items: center; justify-content: center; background-color: transparent; padding: 10px;">
                <img src="assets/logo.png" alt="Senaivest Icon" style="max-width: 100%; max-height: 100%; object-fit: contain;">
            </div>`;

if (installHtml.includes(oldInstallIcon)) {
    installHtml = installHtml.replace(oldInstallIcon, newInstallIcon);
    console.log('install.html icon restored!');
} else {
    console.log('oldInstallIcon not found');
}

fs.writeFileSync('install.html', installHtml);
