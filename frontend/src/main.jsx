
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import App from "./App.jsx";
import AuthScreen from "./AuthScreen.jsx";
import "./index.css";

function Root() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);
    });

    return unsubscribe;
  }, []);

  if (checkingAuth) {
    return <p style={{ textAlign: "center", padding: 40 }}>Loading...</p>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 12,
          padding: "12px 24px",
          background: "#f3f5fa",
          color: "#172033",
          flexWrap: "wrap",
        }}
      >
        <span>{user.email}</span>
        <button
          onClick={() => signOut(auth)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #ccd3e0",
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
      <App />
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
