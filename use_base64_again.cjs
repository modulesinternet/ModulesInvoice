const fs = require('fs');
let code = fs.readFileSync('src/components/InvoicesModule.tsx', 'utf8');

code = code.replace(
  /const imgFormat = selectedInvoice\.challanUrl\.includes\('png'\) \|\| selectedInvoice\.challanUrl\.startsWith\('data:image\/png'\) \? 'PNG' : 'JPEG';\s*pdf\.addImage\(selectedInvoice\.challanUrl, imgFormat, 10, 10, 190, 277, undefined, 'FAST'\);/g,
  `const b64Challan = await toBase64(selectedInvoice.challanUrl);
            const imgFormat = selectedInvoice.challanUrl.includes('png') || selectedInvoice.challanUrl.startsWith('data:image/png') || b64Challan.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            pdf.addImage(b64Challan, imgFormat, 10, 10, 190, 277, undefined, 'FAST');`
);

fs.writeFileSync('src/components/InvoicesModule.tsx', code);
