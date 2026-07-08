const fs = require('fs');
let code = fs.readFileSync('src/components/LedgerModule.tsx', 'utf8');

code = code.replace(/Debit \(\+\)/g, 'Invoice Value (+)');
code = code.replace(/Debit columns \(\+\)/g, 'Invoice Value (+)');
code = code.replace(/Outstanding debit due/g, 'Outstanding amount due');

fs.writeFileSync('src/components/LedgerModule.tsx', code);
