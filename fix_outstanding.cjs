const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The client's outstanding balance might be out of sync. 
// We can just set totalOutstanding = unpaidInvoicesValue
code = code.replace(/const totalOutstanding = clients\.reduce\(\(sum, c\) => sum \+ \(c\.outstandingBalance \|\| 0\), 0\);/g, 'const totalOutstanding = unpaidInvoicesValue;');

fs.writeFileSync('src/App.tsx', code);
