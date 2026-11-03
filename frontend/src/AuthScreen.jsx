
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase";
import "./AuthScreen.css";

export default function AuthScreen() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      const messages = {
        "auth/email-already-in-use": "This email is already registered. Please sign in.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Use a password with at least 6 characters.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/network-request-failed": "Network error. Check your internet connection.",
        "auth/operation-not-allowed": "Enable Email/Password in Firebase Authentication.",
      };

      setError(messages[err.code] || err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">M<span>O</span>M</div>
        <p className="auth-tagline">MEETING MINUTES, MADE SIMPLE</p>

        <h1>{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-description">
          {isSignup
            ? "Start turning your meetings into clear notes."
            : "Sign in to continue to your meeting workspace."}
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? "Already have an account?" : "New to MOM Summarizer?"}
          {" "}
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>

        <p className="auth-footer">
          Your meetings. Your notes. Your workspace.
        </p>
      </section>
    </main>
  );
}
