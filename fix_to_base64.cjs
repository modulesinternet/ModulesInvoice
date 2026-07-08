const fs = require('fs');
let code = fs.readFileSync('src/components/InvoicesModule.tsx', 'utf8');

code = code.replace(/async function toBase64[\s\S]*?async function mergePdfAttachments/g, `async function toBase64(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
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
    console.warn("Fetch base64 failed, trying canvas load for url:", url, err);
    try {
      return await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
              return;
            }
            reject(new Error('no canvas context'));
          } catch (canvasErr) {
            reject(canvasErr);
          }
        };
        img.onerror = reject;
        img.src = url;
      });
    } catch (canvasErr) {
      console.warn("Could not pre-convert URL to base64, continuing with original:", canvasErr);
      return url;
    }
  }
}

async function mergePdfAttachments`);

fs.writeFileSync('src/components/InvoicesModule.tsx', code);
