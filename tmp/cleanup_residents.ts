
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "gen-lang-client-0084084846",
  "appId": "1:201105295073:web:a15d12bb3b0991a71899a0",
  "apiKey": "AIzaSyD-aHmGF7bKvRSJG9I__yt15w4hVfxMfVA",
  "authDomain": "gen-lang-client-0084084846.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-1c56abac-a828-403a-bf91-a73b9ef5c4e8",
  "storageBucket": "gen-lang-client-0084084846.firebasestorage.app",
  "messagingSenderId": "201105295073",
  "measurementId": ""
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function cleanupInChunks() {
  console.log("Starting cleanup in chunks...");
  let deletedTotal = 0;
  let hasMore = true;

  while (hasMore) {
    const q = query(collection(db, "warga"), limit(100));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      console.log("No more residents found.");
      break;
    }

    console.log(`Checking ${snap.size} residents...`);
    let deletedInThisBatch = 0;
    
    for (const d of snap.docs) {
      const data = d.data();
      const isNikEmpty = !data.nik || data.nik === "-" || data.nik.trim() === "";
      const isNamaEmpty = !data.nama || data.nama === "-" || data.nama.trim() === "";
      
      if (isNikEmpty && isNamaEmpty) {
        await deleteDoc(doc(db, "warga", d.id));
        deletedInThisBatch++;
      }
    }
    
    deletedTotal += deletedInThisBatch;
    console.log(`Deleted ${deletedInThisBatch} in this batch. Total deleted: ${deletedTotal}`);
    
    // If we didn't delete anything in this batch, it means we've checked the first 100 
    // and none were empty. Since we are using a simple query without offset (Firestore doesn't support easy offset),
    // we might loop forever if we don't handle this.
    if (deletedInThisBatch === 0) {
      console.log("Reached a batch with no empty records. Stopping to avoid infinite loop.");
      hasMore = false;
    }
  }

  console.log(`Cleanup complete. Total deleted: ${deletedTotal}`);
}

cleanupInChunks().catch(console.error);
