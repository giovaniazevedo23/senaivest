const fs = require('fs');

function fixFontColor() {
    let html = fs.readFileSync('index.html', 'utf8');

    // Button 1 (Blue)
    const btn1Target = `class="btn-card-transfer" style="background: #3b82f6 !important; flex: 1; padding: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 700; cursor: pointer;">`;
    const btn1Replacement = `class="btn-card-transfer" style="background: #3b82f6 !important; flex: 1; padding: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 700; cursor: pointer; color: #fff !important;">`;
    
    html = html.replace(btn1Target, btn1Replacement);

    // Button 2 (Purple)
    const btn2Target = `class="btn-card-transfer" style="background: #8b5cf6 !important; flex: 1; padding: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 700; cursor: pointer;">`;
    const btn2Replacement = `class="btn-card-transfer" style="background: #8b5cf6 !important; flex: 1; padding: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 700; cursor: pointer; color: #fff !important;">`;
    
    html = html.replace(btn2Target, btn2Replacement);

    fs.writeFileSync('index.html', html, 'utf8');
}

fixFontColor();
