import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Old App Credentials (Source of Real Data)
const oldConfig = {
  projectId: "reverberant-grammar-ptgzl",
  appId: "1:136984818838:web:8f57340b85f70cf53f7eb7",
  apiKey: "AIzaSyDx-16U5VXpjxGWcHx6H_vkC0T3YSVQyvk",
  authDomain: "reverberant-grammar-ptgzl.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-fd4d4c28-547e-4d9a-a6cd-f7c2e20eb217",
  storageBucket: "reverberant-grammar-ptgzl.firebasestorage.app",
  messagingSenderId: "136984818838"
};

// New App Credentials (Destination for Real Data)
const newConfig = {
  projectId: "imodules-de7bf",
  appId: "1:502890188008:web:eb5e181160ad4750a3cd5d",
  apiKey: "AIzaSyD_Set_JX6h6KvQjcCZ8Kj0-ES_hU-snfs",
  authDomain: "imodules-de7bf.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-fd4d4c28-547e-4d9a-a6cd-f7c2e20eb217",
  storageBucket: "imodules-de7bf.firebasestorage.app",
  messagingSenderId: "502890188008"
};

async function executeMigration() {
  console.log("------------------------------------------------------------------");
  console.log("            FIRESTORE REAL DATA MIGRATION ENGINE INITIATED");
  console.log("------------------------------------------------------------------");
  console.log(`Source Cloud Project: ${oldConfig.projectId}`);
  console.log(`Destination Cloud Project: ${newConfig.projectId}`);
  console.log(`Shared Database Name: ${oldConfig.firestoreDatabaseId}`);
  console.log("------------------------------------------------------------------");

  // Initialize Source (Old App Instance)
  const oldApp = initializeApp(oldConfig, 'oldAppSource');
  const oldDb = getFirestore(oldApp, oldConfig.firestoreDatabaseId);

  // Initialize Destination (New App Instance)
  const newApp = initializeApp(newConfig, 'newAppDestination');
  const newDb = getFirestore(newApp, newConfig.firestoreDatabaseId);

  // Define collections and document specifications
  const collectionsList = [
    { name: 'clients', idKey: 'id', cacheKey: 'db_clients' },
    { name: 'products', idKey: 'id', cacheKey: 'db_products' },
    { name: 'invoices', idKey: 'id', cacheKey: 'db_invoices' },
    { name: 'quotations', idKey: 'id', cacheKey: 'db_quotations' },
    { name: 'payments', idKey: 'id', cacheKey: 'db_payments' },
    { name: 'ledger', idKey: 'id', cacheKey: 'db_ledger' },
    { name: 'cashbook', idKey: 'id', cacheKey: 'db_cashbook' },
    { name: 'activityLogs', idKey: 'id', cacheKey: 'db_logs' },
    { name: 'notifications', idKey: 'id', cacheKey: 'db_notifications' },
    { name: 'users', idKey: 'userId', cacheKey: 'db_users' },
    { name: 'fcmTokens', idKey: 'tokenId', cacheKey: 'db_fcm_tokens' }
  ];

  const localCacheObject: Record<string, any> = {};

  // --- Step 1: Migrate businessSettings ---
  console.log("\n[Step 1] Migrating 'businessSettings' documents...");
  const settingsDocsList = ['global', 'categories', 'roles', 'passwords'];
  
  for (const docId of settingsDocsList) {
    try {
      const snap = await getDocs(collection(oldDb, 'businessSettings'));
      const oldDocRef = snap.docs.find(d => d.id === docId);
      
      if (oldDocRef) {
        const val = oldDocRef.data();
        console.log(`  -> Business Settings document [${docId}] found on Old DB. Migrating...`);
        
        // Write to destination Firestore
        await setDoc(doc(newDb, 'businessSettings', docId), val);
        
        // Save to cache memory mapping
        if (docId === 'global') {
          localCacheObject['db_settings'] = val;
        } else if (docId === 'categories') {
          localCacheObject['db_categories'] = val.list || [];
        } else if (docId === 'roles') {
          localCacheObject['db_roles'] = val.list || [];
        } else if (docId === 'passwords') {
          localCacheObject['db_passwords'] = val;
        }
      } else {
        console.log(`  -> Warning: Business Settings [${docId}] not found in source.`);
      }
    } catch (err: any) {
      console.error(`  -> Failed migrating settings [${docId}]:`, err.message);
    }
  }

  // --- Step 2: Migrate general collections ---
  console.log("\n[Step 2] Migrating primary collections (deleting existing, cloning source)...");
  
  for (const colMap of collectionsList) {
    try {
      console.log(`\n  --- Processing Collection: '${colMap.name}' ---`);
      
      // A. Pull from Source
      const sourceSnap = await getDocs(collection(oldDb, colMap.name));
      const sourceRecords = sourceSnap.docs.map(doc => doc.data());
      console.log(`    * Found ${sourceRecords.length} records in source '${colMap.name}'.`);
      
      // B. Clean up New Collection (Delete current/demo data)
      const destSnap = await getDocs(collection(newDb, colMap.name));
      if (!destSnap.empty) {
        console.log(`    * Deleting ${destSnap.size} existing/demo records in target '${colMap.name}' to prevent clutter...`);
        const batchDelete = writeBatch(newDb);
        destSnap.docs.forEach((docRef) => {
          batchDelete.delete(docRef.ref);
        });
        await batchDelete.commit();
        console.log(`    * Cleaned target collection '${colMap.name}' completely.`);
      }

      // C. Populate to New Collection
      if (sourceRecords.length > 0) {
        console.log(`    * Writing ${sourceRecords.length} real source records of '${colMap.name}' to target...`);
        const batchSize = 400;
        for (let i = 0; i < sourceRecords.length; i += batchSize) {
          const batchWrite = writeBatch(newDb);
          const chunk = sourceRecords.slice(i, i + batchSize);
          
          chunk.forEach((item) => {
            const key = colMap.idKey;
            const docId = item[key];
            if (docId) {
              batchWrite.set(doc(newDb, colMap.name, docId), item);
            }
          });
          
          await batchWrite.commit();
        }
        console.log(`    * Completed synchronization of '${colMap.name}'.`);
      }

      // D. Assign to Memory cache map
      localCacheObject[colMap.cacheKey] = sourceRecords;

    } catch (colErr: any) {
      console.error(`  -> Failed processing collection '${colMap.name}':`, colErr.message);
    }
  }

  // --- Step 3: Write out updated local-db-cache.json ---
  console.log("\n[Step 3] Synchronizing Local Cache file 'local-db-cache.json' with actual real data...");
  try {
    const cachePath = path.join(process.cwd(), 'local-db-cache.json');
    
    // Merge or full write
    fs.writeFileSync(cachePath, JSON.stringify(localCacheObject, null, 2), 'utf8');
    console.log(`  -> Successfully wrote real migrated database state into: ${cachePath}`);
  } catch (cacheErr: any) {
    console.error("  -> Failed writing local database cache:", cacheErr.message);
  }

  console.log("\n------------------------------------------------------------------");
  console.log("            MIGRATION FINISHED SUCCESSFULLY! All real data cloned.");
  console.log("------------------------------------------------------------------\n");
  process.exit(0);
}

executeMigration().catch(err => {
  console.error("Migration fatal error:", err);
  process.exit(1);
});
