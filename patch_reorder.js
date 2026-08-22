const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexFile, 'utf8');

const recentRegex = /([\t ]*<!-- Artigos Recentes \(Novidade\) -->\r?\n[\t ]*<h2 class="section-title"[^>]*>Artigos Recentes<\/h2>\r?\n[\t ]*<div id="dashboard-recent-articles"[^>]*>\r?\n[\t ]*<div[^>]*>Carregando artigos\.\.\.<\/div>\r?\n[\t ]*<\/div>\r?\n)/;

const match = html.match(recentRegex);
if (match) {
    const recentBlock = match[0];
    html = html.replace(recentRegex, '');
    
    // Find the Mais lidos section
    const maisLidosRegex = /([\t ]*<!-- Knowledge & Training Section - Mais lidos \(Image 1\) -->)/;
    html = html.replace(maisLidosRegex, recentBlock + '\n$1');
    
    fs.writeFileSync(indexFile, html, 'utf8');
    console.log('Successfully moved Artigos Recentes.');
} else {
    console.log('Regex did not match Artigos Recentes block.');
}
