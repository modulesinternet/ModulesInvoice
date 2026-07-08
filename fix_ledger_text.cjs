const fs = require('fs');
let code = fs.readFileSync('src/components/LedgerModule.tsx', 'utf8');

code = code.replace(/Total Debited Invoices/g, 'Total Invoice Value');
code = code.replace(/Total Debited Invoicing/g, 'Total Invoice Value');
code = code.replace(/>Debited<\/span>/g, '>Invoice Value</span>');

fs.writeFileSync('src/components/LedgerModule.tsx', code);
