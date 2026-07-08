const fs = require('fs');
let code = fs.readFileSync('src/components/InvoicesModule.tsx', 'utf8');

code = code.replace(/async function mergePdfAttachments/, `
async function toBase64Rounded(url: string, roundedRatio: number = 0.12): Promise<string> {
  if (!url) return '';
  try {
    const rawBase64 = await toBase64(url);
    if (!rawBase64) return '';
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(rawBase64);
          
          ctx.beginPath();
          const radius = Math.min(img.width, img.height) * roundedRatio;
          ctx.moveTo(radius, 0);
          ctx.lineTo(img.width - radius, 0);
          ctx.quadraticCurveTo(img.width, 0, img.width, radius);
          ctx.lineTo(img.width, img.height - radius);
          ctx.quadraticCurveTo(img.width, img.height, img.width - radius, img.height);
          ctx.lineTo(radius, img.height);
          ctx.quadraticCurveTo(0, img.height, 0, img.height - radius);
          ctx.lineTo(0, radius);
          ctx.quadraticCurveTo(0, 0, radius, 0);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve(rawBase64);
        }
      };
      img.onerror = () => resolve(rawBase64);
      img.src = rawBase64;
    });
  } catch (err) {
    console.warn("toBase64Rounded failed, falling back to clean original", err);
    return toBase64(url);
  }
}

async function mergePdfAttachments`);

fs.writeFileSync('src/components/InvoicesModule.tsx', code);
