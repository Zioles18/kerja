import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function main() {
  const email = "owner@datawarga.com";
  const pass = "k7#vP9$mQ2!xL5@w";
  
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    console.log("Created successfully with new password");
    process.exit(0);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log("Email already in use. Cannot simply change password without old password or admin SDK.");
      process.exit(0);
    } else {
      console.error(err);
      process.exit(1);
    }
  }
}

main();
