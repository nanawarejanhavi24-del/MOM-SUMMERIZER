
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAid5hyAiZmXMy6nBmjs2kVAp8V4hBVty8",
  authDomain: "mom-summarizer-app.firebaseapp.com",
  projectId: "mom-summarizer-app",
  storageBucket: "mom-summarizer-app.firebasestorage.app",
  messagingSenderId: "205095571139",
  appId: "mom-summarizer-app",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export default app;
