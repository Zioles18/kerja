import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function main() {
  const email = "owner@datawarga.com";
  const oldPass = "Owner123!";
  const newPass = "k7#vP9$mQ2!xL5@w";

  try {
    console.log(`Trying to sign in with ${email} and old password...`);
    const userCredential = await signInWithEmailAndPassword(auth, email, oldPass);
    console.log("Sign-in successful!");

    console.log(`Updating password to ${newPass}...`);
    await updatePassword(userCredential.user, newPass);
    console.log("Password updated successfully!");

    process.exit(0);
  } catch (error) {
    console.error("Failed to update password:", error);
    process.exit(1);
  }
}

main();
