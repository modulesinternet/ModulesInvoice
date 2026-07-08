const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the stranded `});`
code = code.replace(/\/\/ Trigger real system pull-down local notification banner on Android[\s\S]*?\}\);/g, '// Trigger real system pull-down local notification banner on Android');

fs.writeFileSync('src/App.tsx', code);
