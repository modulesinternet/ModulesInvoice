const fs = require('fs');
let code = fs.readFileSync('src/components/InvoicesModule.tsx', 'utf8');

// Update toBase64 to use proxy
code = code.replace(/async function toBase64\(url: string\): Promise<string> \{[\s\S]*?async function toBase64Rounded/, `async function toBase64(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  try {
    const isFirebase = url.includes('firebasestorage.googleapis.com');
    const fetchUrl = isFirebase ? \`/api/proxy-file?url=\${encodeURIComponent(url)}\` : url;
    
    const res = await fetch(fetchUrl);
    const arrayBuffer = await res.arrayBuffer();
    
    // Convert ArrayBuffer to Base64
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const b64 = window.btoa(binary);
    
    // Determine mime type from URL or fallback
    let mime = 'image/jpeg';
    if (url.toLowerCase().includes('.png')) mime = 'image/png';
    else if (url.toLowerCase().includes('.pdf')) mime = 'application/pdf';
    
    return \`data:\${mime};base64,\${b64}\`;
  } catch (err) {
    console.warn("Fetch base64 failed, returning original url:", err);
    return url;
  }
}

async function toBase64Rounded`);

// Update mergePdfAttachments to use proxy
code = code.replace(/const response = await fetch\(challanUrl\);/, `const isFirebase = challanUrl.includes('firebasestorage.googleapis.com');
      const fetchUrl = isFirebase ? \`/api/proxy-file?url=\${encodeURIComponent(challanUrl)}\` : challanUrl;
      const response = await fetch(fetchUrl);`);

fs.writeFileSync('src/components/InvoicesModule.tsx', code);
