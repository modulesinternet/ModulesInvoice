import fs from 'fs';
import path from 'path';
import https from 'https';

// --- Phase 1: Build Number Auto-Increment ---
const versionFilePath = path.join(process.cwd(), 'version.json');
let versionData = { version: '1.1.2', build: "12" };

if (fs.existsSync(versionFilePath)) {
  try {
    const raw = fs.readFileSync(versionFilePath, 'utf8');
    versionData = JSON.parse(raw);
  } catch (err) {
    console.error("Error reading version.json, using defaults", err);
  }
}

const currentBuild = parseInt(versionData.build, 10) || 12;
versionData.build = (currentBuild + 1).toString();
fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2), 'utf8');
console.log(`Prebuild auto-increment: Version v${versionData.version} (Build ${versionData.build}) saved.`);

// --- Phase 2: Live Firestore Configuration & Synchronization ---
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let projectId = 'reverberant-grammar-ptgzl';
let databaseId = 'ai-studio-fd4d4c28-547e-4d9a-a6cd-f7c2e20eb217';

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    if (raw.projectId) projectId = raw.projectId;
    if (raw.firestoreDatabaseId) databaseId = raw.firestoreDatabaseId;
  } catch (err) {
    console.error("Error reading firebase-applet-config.json:", err.message);
  }
}

const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/businessSettings/global`;

function fetchSettings() {
  return new Promise((resolve, reject) => {
    const req = https.get(docUrl, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Fetch settings HTTP Status ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Firestore Fetch Timeout'));
    });
  });
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP Status ${res.statusCode}`));
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
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Download Image Timeout'));
    });
  });
}

async function syncAppDetails() {
  let companyName = "Internet Modules";
  let logoUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80";

  try {
    console.log("Fetching live corporate settings from Firestore...");
    const data = await fetchSettings();
    if (data && data.fields) {
      if (data.fields.companyName && data.fields.companyName.stringValue) {
        companyName = data.fields.companyName.stringValue.trim();
      }
      if (data.fields.logoUrl && data.fields.logoUrl.stringValue) {
        logoUrl = data.fields.logoUrl.stringValue.trim();
      }
    }
    console.log(`Active Corporate settings loaded. Name: "${companyName}", Logo URL: ${logoUrl}`);
  } catch (error) {
    console.log("Bypassing live fetch, reading from local DB-cache fallback...", error.message);
    try {
      const cachePath = path.join(process.cwd(), 'local-db-cache.json');
      if (fs.existsSync(cachePath)) {
        const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        if (raw.db_settings) {
          if (raw.db_settings.companyName) companyName = raw.db_settings.companyName;
          if (raw.db_settings.logoUrl) logoUrl = raw.db_settings.logoUrl;
        }
      }
    } catch (e) {
      console.log("Local cache lookup failed:", e.message);
    }
  }

  // A. Harmonize capacitor.config.ts App Name
  const capConfigPath = path.join(process.cwd(), 'capacitor.config.ts');
  if (fs.existsSync(capConfigPath)) {
    try {
      let content = fs.readFileSync(capConfigPath, 'utf8');
      const regex = /appName:\s*['"`](.*?)['"`]/g;
      if (regex.test(content)) {
        content = content.replace(regex, `appName: '${companyName.replace(/'/g, "\\'")}'`);
        fs.writeFileSync(capConfigPath, content, 'utf8');
        console.log(`Synchronized Capacitor appName option to: "${companyName}"`);
      }
    } catch (err) {
      console.error("Failed to sync capacitor.config.ts:", err.message);
    }
  }

  // B. Harmonize strings.xml App Name
  const stringsPath = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
  if (fs.existsSync(stringsPath)) {
    try {
      let content = fs.readFileSync(stringsPath, 'utf8');
      
      const appNameRegex = /<string name="app_name">(.*?)<\/string>/g;
      const titleRegex = /<string name="title_activity_main">(.*?)<\/string>/g;

      content = content.replace(appNameRegex, `<string name="app_name">${companyName}</string>`);
      content = content.replace(titleRegex, `<string name="title_activity_main">${companyName}</string>`);

      fs.writeFileSync(stringsPath, content, 'utf8');
      console.log(`Synchronized Android strings.xml labels to: "${companyName}"`);
    } catch (err) {
      console.error("Failed to sync Android strings.xml:", err.message);
    }
  }

  // C. Harmonize Android launcher mipmap icons
  const resPath = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');
  if (fs.existsSync(resPath)) {
    const tempFile = path.join(process.cwd(), 'temp_logo_sync.png');
    try {
      console.log(`Downloading corporate icon assets from ${logoUrl}...`);
      await downloadImage(logoUrl, tempFile);
      console.log("Icon download completed, beginning mipmap directory transplantation...");

      const MIPPED_DIRS = [
        'mipmap-hdpi',
        'mipmap-mdpi',
        'mipmap-xhdpi',
        'mipmap-xxhdpi',
        'mipmap-xxxhdpi'
      ];

      for (const dir of MIPPED_DIRS) {
        const targetDir = path.join(resPath, dir);
        if (fs.existsSync(targetDir)) {
          const p1 = path.join(targetDir, 'ic_launcher.png');
          const p2 = path.join(targetDir, 'ic_launcher_round.png');
          const p3 = path.join(targetDir, 'ic_launcher_foreground.png');
          
          fs.copyFileSync(tempFile, p1);
          fs.copyFileSync(tempFile, p2);
          fs.copyFileSync(tempFile, p3);
          console.log(`Transplanted updated corporate logo inside ${dir}`);
        }
      }
      console.log("App icon assets transplantation completed successfully!");
    } catch (err) {
      console.error("App icon transplantation bypassed/failed: ", err.message);
    } finally {
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (_) {}
      }
    }
  }
}

syncAppDetails().then(() => {
  console.log("Prebuild synchronization sequence completed.");
}).catch((err) => {
  console.error("Prebuild sequence encountered errors:", err.message);
});
