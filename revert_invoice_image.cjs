const fs = require('fs');
let code = fs.readFileSync('src/components/InvoicesModule.tsx', 'utf8');

code = code.replace(
  /const b64Challan = await toBase64\(selectedInvoice\.challanUrl\);[\s\S]*?pdf\.addImage\(b64Challan, imgFormat, 10, 10, 190, 277, undefined, 'FAST'\);/g,
  `const imgFormat = selectedInvoice.challanUrl.includes('png') || selectedInvoice.challanUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            pdf.addImage(selectedInvoice.challanUrl, imgFormat, 10, 10, 190, 277, undefined, 'FAST');`
);

fs.writeFileSync('src/components/InvoicesModule.tsx', code);
