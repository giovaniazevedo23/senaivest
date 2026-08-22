const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Remove orphan </div> right after "Knowledge & Training Section"
let badDiv = `                    <!-- Knowledge & Training Section (replacing bottom-banner-photo) -->\r\n                    </div>\r\n`;
let badDivAlt = `                    <!-- Knowledge & Training Section (replacing bottom-banner-photo) -->\n                    </div>\n`;

html = html.replace(badDiv, `                    <!-- Knowledge & Training Section (replacing bottom-banner-photo) -->\r\n`);
html = html.replace(badDivAlt, `                    <!-- Knowledge & Training Section (replacing bottom-banner-photo) -->\n`);

// Hide presence bar
let profBar = `            <div id="presence-bar" style="display:none; align-items:center; gap:0; padding: 15px 20px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-color); overflow-x: auto; min-height: 80px; flex-shrink: 0;">`;
html = html.replace(profBar, `            <!-- Ocultado a pedido -->\r\n            <!--\r\n            <div id="presence-bar" style="display:none; align-items:center; gap:0; padding: 15px 20px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-color); overflow-x: auto; min-height: 80px; flex-shrink: 0;">`);

let profEnd = `                <div id="presence-bubbles" style="display:flex; gap:16px; align-items:flex-end; padding: 4px 0;"></div>\r\n            </div>`;
let profEndAlt = `                <div id="presence-bubbles" style="display:flex; gap:16px; align-items:flex-end; padding: 4px 0;"></div>\n            </div>`;

html = html.replace(profEnd, `                <div id="presence-bubbles" style="display:flex; gap:16px; align-items:flex-end; padding: 4px 0;"></div>\r\n            </div>\r\n            -->`);
html = html.replace(profEndAlt, `                <div id="presence-bubbles" style="display:flex; gap:16px; align-items:flex-end; padding: 4px 0;"></div>\n            </div>\n            -->`);

fs.writeFileSync('index.html', html);
console.log("Correção HTML aplicada!");
