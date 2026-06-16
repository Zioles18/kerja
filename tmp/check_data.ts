
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./src/firebase";

async function checkResidentData() {
  const q = query(collection(db, "warga"), where("nama", "==", "GUSTI AYU AGUNG MAHAYANI"));
  const snap = await getDocs(q);
  console.log(`Found ${snap.size} documents for GUSTI AYU AGUNG MAHAYANI`);
  
  snap.docs.forEach(doc => {
    console.log("Doc ID:", doc.id);
    console.log("Data:", JSON.stringify(doc.data(), null, 2));
  });

  const q2 = query(collection(db, "mutasi_warga"), where("nama", "==", "GUSTI AYU AGUNG MAHAYANI"));
  const snap2 = await getDocs(q2);
  console.log(`\nFound ${snap2.size} mutation documents for GUSTI AYU AGUNG MAHAYANI`);
  
  snap2.docs.forEach(doc => {
    console.log("Mutation Doc ID:", doc.id);
    console.log("Mutation Data:", JSON.stringify(doc.data(), null, 2));
  });
}

checkResidentData();
