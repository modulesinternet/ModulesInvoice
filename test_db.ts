import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

async function main() {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    console.error("Config path not found!");
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log("Using config project ID:", config.projectId);
  console.log("Using DB instance ID (custom):", config.firestoreDatabaseId);

  const app = initializeApp(config);
  const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, config.firestoreDatabaseId);

  try {
    console.log("Fetching global settings from businessSettings/global...");
    const snap = await getDoc(doc(db, 'businessSettings', 'global'));
    console.log("Exists?", snap.exists());
    if (snap.exists()) {
      console.log("Data:", snap.data());
    } else {
      console.log("Document does not exist yet!");
    }
    process.exit(0);
  } catch (err) {
    console.error("Connection failed with error:", err);
    process.exit(1);
  }
}

main();
