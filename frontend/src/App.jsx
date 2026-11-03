
import { useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function generateMOM() {
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate MOM.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!result) return;

    const report = [
      "MEETING MINUTES",
      "",
      `File: ${result.filename}`,
      `Detected Language: ${result.language}`,
      "",
      "SUMMARY",
      result.summary,
      "",
      "KEY POINTS",
      ...result.key_points.map((point, index) => `${index + 1}. ${point}`),
      "",
      "ACTION ITEMS",
      ...(result.action_items.length
        ? result.action_items
        : ["No action items extracted."]),
      "",
      "FULL TRANSCRIPT",
      result.transcript,
    ].join("\n");

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Meeting-Minutes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      <header>
        <h2>📝 MOM Summarizer</h2>
        <p>AI-powered Meeting Minutes Generator</p>
      </header>

      <main className="card">
        <h1>Generate Meeting Minutes</h1>
        <p>Upload meeting audio or video to generate a transcript and summary.</p>

        <label htmlFor="meetingFile" className="upload-box">
          <span className="upload-icon">⬆</span>
          <strong>{file ? file.name : "Choose an audio or video file"}</strong>
          <span>MP3, WAV, M4A, MP4, MOV</span>
        </label>

        <input
          id="meetingFile"
          type="file"
          accept="audio/*,video/*"
          onChange={(event) => {
            setFile(event.target.files[0] || null);
            setResult(null);
            setError("");
          }}
        />

        <p className="languages">
          Supported languages: English • Hindi • Marathi
        </p>

        <button onClick={generateMOM} disabled={!file || loading}>
          {loading ? "Generating MOM..." : "Generate MOM"}
        </button>

        {error && <p role="alert" className="error">{error}</p>}

        {result && (
          <section className="results">
            <h2>Meeting Minutes</h2>
            <p><strong>Detected language:</strong> {result.language}</p>

            <h3>Summary</h3>
            <p>{result.summary}</p>

            <h3>Key Points</h3>
            <ul>
              {result.key_points.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>

            <h3>Full Transcript</h3>
            <p className="transcript">{result.transcript}</p>

            <button onClick={downloadReport}>Download MOM Report</button>
          </section>
        )}
      </main>

      <footer>MOM Summarizer | Mini Project</footer>
    </div>
  );
}

export default App;
