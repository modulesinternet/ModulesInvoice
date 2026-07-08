const fs = require('fs');
let code = fs.readFileSync('src/components/InvoicesModule.tsx', 'utf8');

code = code.replace(
  /const propertyName = \(businessSettings\?.companyName \|\| "Invoice"\)\.replace\(\/\\s\+\/g, ''\);/g,
  'const propertyName = ((selectedInvoice?.clientName || businessSettings?.companyName || "Client") + "").replace(/\\s+/g, "");'
);

fs.writeFileSync('src/components/InvoicesModule.tsx', code);
