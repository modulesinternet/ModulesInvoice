const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// fix setNotifications
code = code.replace(/setNotifications\(prev => \{[\s\S]*?\}\);/g, '');

// fix androidIncomingCall null usages
code = code.replace(/api\.createLog\('CALL_ACCEPTED'[\s\S]*?\)\.catch\(\(\) => \{\}\);/g, '');
code = code.replace(/api\.createLog\('CALL_DECLINED'[\s\S]*?\)\.catch\(\(\) => \{\}\);/g, '');
code = code.replace(/\{null && \([\s\S]*?<\/div>\s*\)\}/g, '');

fs.writeFileSync('src/App.tsx', code);
