import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import dns from 'dns';
import { URL } from 'url';

// Helper to quickly check DNS resolution with a custom timeout of 500ms
function checkDns(hostname) {
  return new Promise((resolve) => {
    if (!hostname || hostname === 'localhost') {
      resolve(false);
      return;
    }
    const timeoutId = setTimeout(() => {
      resolve(false);
    }, 500);

    dns.lookup(hostname, (err) => {
      clearTimeout(timeoutId);
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

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
let projectId = 'imodules-de7bf';
let databaseId = 'ai-studio-fd4d4c28-547e-4d9a-a6cd-f7c2e20eb217';
let apiKey = '';

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    if (raw.projectId) projectId = raw.projectId;
    if (raw.firestoreDatabaseId) databaseId = raw.firestoreDatabaseId;
    if (raw.apiKey) apiKey = raw.apiKey;
  } catch (err) {
    console.error("Error reading firebase-applet-config.json:", err.message);
  }
}

let docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/businessSettings/global`;
if (apiKey) {
  docUrl += `?key=${apiKey}`;
}

async function fetchSettings() {
  const isOnline = await checkDns('firestore.googleapis.com');
  if (!isOnline) {
    throw new Error('Firestore host is offline/unreachable (DNS fallback)');
  }
  return new Promise((resolve, reject) => {
    const req = https.get(docUrl, { timeout: 1200 }, (res) => {
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
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 1500 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume(); // Consume response data to prevent memory leak / hanging socket
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
  let companyName = "iModules";
  let logoUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80";

  // Priority 1: Check Local cache file first (offline, 100% reliable during build sandbox)
  const cachePath = path.join(process.cwd(), 'local-db-cache.json');
  let cacheFound = false;
  if (fs.existsSync(cachePath)) {
    try {
      console.log("Loading brand parameters from local database cache...");
      const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (raw.db_settings) {
        if (raw.db_settings.companyName) companyName = raw.db_settings.companyName.trim();
        if (raw.db_settings.logoUrl) logoUrl = raw.db_settings.logoUrl.trim();
        cacheFound = true;
        console.log(`Successfully restored cached corporate brand details. Name: "${companyName}", Logo URL: ${logoUrl && logoUrl.startsWith('data:') ? 'base64 payload' : logoUrl}`);
      }
    } catch (e) {
      console.warn("Local cache read failed, falling back...", e.message);
    }
  }

  // Priority 2: In case cache was not found or empty, fetch via Firestore REST API as fallback
  if (!cacheFound) {
    try {
      console.log("No local brand cache found. Contacting remote Cloud Firestore REST endpoints...");
      const data = await fetchSettings();
      if (data && data.fields) {
        if (data.fields.companyName && data.fields.companyName.stringValue) {
          companyName = data.fields.companyName.stringValue.trim();
        }
        if (data.fields.logoUrl && data.fields.logoUrl.stringValue) {
          logoUrl = data.fields.logoUrl.stringValue.trim();
        }
      }
      console.log(`Successfully fetched brand parameters. Name: "${companyName}"`);
    } catch (error) {
      console.log("Cloud Run build offline: REST fallback failed. Using hardcoded defaults.", error.message);
    }
  }

  // 0. Write src/prebuilt-settings.ts for instant, offline-first brand logo and labels loading
  const prebuiltSettingsPath = path.join(process.cwd(), 'src', 'prebuilt-settings.ts');
  const prebuiltSettingsContent = `// Automatically generated by prebuild.js. Do not edit manually.\nexport const prebuiltSettings = {\n  companyName: "${companyName.replace(/"/g, '\\"')}",\n  logoUrl: "${logoUrl.replace(/"/g, '\\"')}"\n};\n`;
  try {
    fs.writeFileSync(prebuiltSettingsPath, prebuiltSettingsContent, 'utf8');
    console.log(`Generated src/prebuilt-settings.ts with companyName: "${companyName}"`);
  } catch (err) {
    console.error("Failed to write prebuilt-settings.ts:", err.message);
  }

  // 0.2 Write src/mobile-config.ts dynamically detecting presence of google-services.json
  const mobileConfigPath = path.join(process.cwd(), 'src', 'mobile-config.ts');
  const googleServicesExist = fs.existsSync(path.join(process.cwd(), 'android', 'app', 'google-services.json'));
  const mobileConfigContent = `// Automatically generated by prebuild.js. Do not edit manually.\nexport const mobileConfig = {\n  googleServicesAvailable: ${googleServicesExist}\n};\n`;
  try {
    fs.writeFileSync(mobileConfigPath, mobileConfigContent, 'utf8');
    console.log(`Generated src/mobile-config.ts. googleServicesAvailable: ${googleServicesExist}`);
  } catch (err) {
    console.error("Failed to write mobile-config.ts:", err.message);
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
      if (logoUrl && logoUrl.startsWith('data:image/')) {
        console.log("Analyzing base64-encoded corporate logo data payload...");
        const matches = logoUrl.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          fs.writeFileSync(tempFile, buffer);
          console.log("Base64 logo successfully decoded and written to temp file.");
        } else {
          throw new Error("Invalid base64 payload format structure");
        }
      } else if (logoUrl) {
        let isOnline = false;
        try {
          const parsedUrl = new URL(logoUrl);
          isOnline = await checkDns(parsedUrl.hostname);
        } catch (_) {}

        if (isOnline) {
          console.log(`Downloading corporate icon assets from ${logoUrl}...`);
          await downloadImage(logoUrl, tempFile);
          console.log("Icon download completed.");
        } else {
          console.log(`[Offline / Sandbox Build] Skipping download of remote assets from: ${logoUrl}`);
          throw new Error("Remote download bypassed because network DNS is unreachable.");
        }
      } else {
        throw new Error("No valid logo URL or base64 data available");
      }

      console.log("Beginning mipmap directory transplantation...");

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
