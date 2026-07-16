const fs = require('fs');

function replaceStrings(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    content = content.replace(/'lesson2': 'assets\/video\.mp4',/g, "'lesson2': 'assets/video IV.mp4',");
    content = content.replace(/'lesson3': 'assets\/video\.mp4'/g, "'lesson3': 'assets/video III.mp4'");
    
    // Also in the JSON object lessonsData
    content = content.replace(/modName: 'Módulo 2: Recursos da Plataforma',\s*duration: '08:45',\s*videoUrl: 'assets\/video\.mp4',/g, 
        "modName: 'Módulo 2: Recursos da Plataforma',\n            duration: '08:45',\n            videoUrl: 'assets/video IV.mp4',");
    content = content.replace(/modName: 'Módulo 2: Recursos da Plataforma',\s*duration: '12:30',\s*videoUrl: 'assets\/video\.mp4',/g, 
        "modName: 'Módulo 2: Recursos da Plataforma',\n            duration: '12:30',\n            videoUrl: 'assets/video III.mp4',");

    fs.writeFileSync(filepath, content, 'utf8');
}

replaceStrings('app_v2.js');
replaceStrings('app.js');
console.log('Successfully patched videos.');
