import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAtV4QyBxd0hHc08jBbLhSK2uLXnP7Lesg",
  authDomain: "sdh-hastane-bildirim.firebaseapp.com",
  projectId: "sdh-hastane-bildirim",
  storageBucket: "sdh-hastane-bildirim.firebasestorage.app",
  messagingSenderId: "443388354829",
  appId: "1:443388354829:web:9b76e17df490e083c41044"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
