import fs from 'fs';
import path from 'path';

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

// Increment build number
const currentBuild = parseInt(versionData.build, 10) || 12;
versionData.build = (currentBuild + 1).toString();

// Write back to version.json
fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2), 'utf8');
console.log(`Prebuild auto-increment: Version v${versionData.version} (Build ${versionData.build}) saved.`);
