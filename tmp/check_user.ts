import { db } from "../src/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

async function check() {
  console.log("Checking Firestore connection and user role...");
  try {
    const email = "owner@datawarga.com";
    console.log(`Searching for user: ${email}`);
    
    // First try a simple getDocs on users collection to see if any access is possible
    const usersCol = collection(db, "users");
    const q = query(usersCol, where("email", "==", email));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      console.log("No user found with email:", email);
      // Let's see if we can see ANY user
      const anySnap = await getDocs(query(usersCol, where("role", "==", "super_admin")));
      console.log(`Found ${anySnap.size} other super_admins`);
    } else {
      snap.forEach(doc => {
        console.log("User found ID:", doc.id);
        const data = doc.data();
        console.log("Role:", data.role);
        console.log("Subscription:", data.subscription);
      });
    }
  } catch (e: any) {
    console.error("CRITICAL ERROR during check:");
    console.error(e.message);
    if (e.code) console.error("Error code:", e.code);
  }
  process.exit(0);
}

check();
