import fs from 'fs';
import path from 'path';
import https from 'https';

const MIPPED_DIRS = [
  'mipmap-hdpi',
  'mipmap-mdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
];

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: HTTP ${res.statusCode}`));
        return;
      }
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      fileStream.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Read logoUrl
let logoUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80";

try {
  const cachePath = path.join(process.cwd(), 'local-db-cache.json');
  if (fs.existsSync(cachePath)) {
    const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (raw.db_settings && raw.db_settings.logoUrl) {
      logoUrl = raw.db_settings.logoUrl;
    }
  }
} catch (e) {
  console.log("Using default logo:", e.message);
}

console.log("Selected App Icon Logo URL:", logoUrl);

async function run() {
  const tempFile = path.join(process.cwd(), 'temp_logo.png');
  try {
    console.log("Downloading corporate logo to temporary holding...");
    await downloadImage(logoUrl, tempFile);
    console.log("Download complete.");
    
    const resPath = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');
    if (!fs.existsSync(resPath)) {
      console.log("Android resource folder not found. Skipping icon transplantation.");
      return;
    }
    
    for (const dir of MIPPED_DIRS) {
      const targetDir = path.join(resPath, dir);
      if (fs.existsSync(targetDir)) {
        const p1 = path.join(targetDir, 'ic_launcher.png');
        const p2 = path.join(targetDir, 'ic_launcher_round.png');
        const p3 = path.join(targetDir, 'ic_launcher_foreground.png');
        
        fs.copyFileSync(tempFile, p1);
        fs.copyFileSync(tempFile, p2);
        fs.copyFileSync(tempFile, p3);
        console.log(`Transplanted logo to ${dir}`);
      }
    }
    console.log("App icon transplantation completed successfully!");
  } catch (err) {
    console.error("Transplant failed:", err);
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

run();
