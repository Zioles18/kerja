import { db } from "../src/firebase";
import { doc, getDoc } from "firebase/firestore";

async function check() {
  console.log("Attempting direct getDoc for 'gratis' package...");
  try {
    const pkgRef = doc(db, "packages", "gratis");
    const snap = await getDoc(pkgRef);
    if (snap.exists()) {
      console.log("SUCCESS: 'gratis' package found!");
      console.log("Data:", JSON.stringify(snap.data(), null, 2));
    } else {
      console.log("NOT FOUND: 'gratis' package document does not exist.");
    }
  } catch (e: any) {
    console.error("FAILED to get document:");
    console.error(e.message);
    if (e.code) console.error("Error code:", e.code);
  }
  process.exit(0);
}

check();
