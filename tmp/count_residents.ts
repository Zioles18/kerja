
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

async function countResidents() {
  console.log("Counting residents...");
  const snap = await getDocs(query(collection(db, "warga"), limit(1000)));
  console.log(`Total residents (limit 1000): ${snap.size}`);
  
  if (snap.size > 0) {
      console.log("Sample resident fields:", Object.keys(snap.docs[0].data()));
      console.log("Sample resident data:", snap.docs[0].data());
  }
}

countResidents().catch(err => {
    console.error("Count failed:", err);
});
