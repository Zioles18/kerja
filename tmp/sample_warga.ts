import { db } from "../src/firebase";
import { collection, limit, getDocs } from "firebase/firestore";

async function sample() {
  console.log("Sampling citizens to find education fields...");
  try {
    const snap = await getDocs(collection(db, "warga"));
    if (snap.empty) {
      console.log("No citizens found.");
    } else {
      console.log(`Found ${snap.size} citizens. Sampling first 3...`);
      snap.docs.slice(0, 3).forEach(doc => {
        console.log(`ID: ${doc.id}`);
        console.log("Data:", JSON.stringify(doc.data(), null, 2));
      });
    }
  } catch (e: any) {
    console.error("Failed to sample data:", e.message);
  }
  process.exit(0);
}

sample();
