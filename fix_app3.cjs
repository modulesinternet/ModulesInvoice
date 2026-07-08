const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/\{null && \([\s\S]*?<AndroidIncomingCallScreen[\s\S]*?\/>\s*\)\}/g, '');

fs.writeFileSync('src/App.tsx', code);
