import { useState } from "react";
import { auth } from "./firebase";
import MeetingReport from "./MeetingReport";
import "./App.css";

function App() {
  const [page, setPage] = useState("dashboard");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState("");

  // GENERATE MEETING MINUTES
  async function generateMOM() {
    if (!file) {
      setError("Please select a meeting file.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please login before uploading.");
      }

      const idToken = await user.getIdToken();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "http://127.0.0.1:5000/api/generate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate MOM.");
      }

      setResult(data);
      setMeetings((previous) => [data, ...previous]);
      setPage("details");
    } catch (err) {
      setError(err.message || "Backend connection failed.");
    } finally {
      setLoading(false);
    }
  }

  // OPEN AN EXISTING MEETING
  function openMeeting(meeting) {
    setResult(meeting);
    setPage("details");
  }

  // START A NEW MEETING
  function startNewMeeting() {
    setFile(null);
    setResult(null);
    setError("");
    setPage("new");
  }

  return (
    <div className="app-layout">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">M</div>

          <div className="brand-text">
            <h2>MOM Summarizer</h2>
            <span>Meeting Assistant</span>
          </div>
        </div>

        <div className="sidebar-menu">
          <p className="menu-label">MENU</p>

          <button
            className={`nav-item ${
              page === "dashboard" ? "active" : ""
            }`}
            onClick={() => setPage("dashboard")}
          >
            <span className="nav-icon">⌂</span>
            Dashboard
          </button>

          <button
            className={`nav-item ${
              page === "new" ? "active" : ""
            }`}
            onClick={startNewMeeting}
          >
            <span className="nav-icon">＋</span>
            New Meeting
          </button>

          <button
            className={`nav-item ${
              page === "history" ? "active" : ""
            }`}
            onClick={() => setPage("history")}
          >
            <span className="nav-icon">◷</span>
            My Meetings
          </button>
        </div>

        {/* USER INFORMATION */}
        <div className="sidebar-bottom">
          <div className="user-card">

            <div className="avatar">
              {(auth.currentUser?.email || "U")[0].toUpperCase()}
            </div>

            <div className="user-info">
              <strong>My Account</strong>
              <span>
                {auth.currentUser?.email || "User"}
              </span>
            </div>

          </div>
        </div>

      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">

        {/* TOP BAR */}
        <header className="topbar">

          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>

            <strong>
              {page === "dashboard" && "Dashboard"}
              {page === "new" && "New Meeting"}
              {page === "history" && "My Meetings"}
              {page === "details" && "Meeting Details"}
            </strong>
          </div>

          <button
            className="top-new-button"
            onClick={startNewMeeting}
          >
            <span>＋</span> New Meeting
          </button>

        </header>

        <div className="page-container">

          {/* DASHBOARD */}
          {page === "dashboard" && (
            <section>

              <div className="welcome-section">

                <div>
                  <span className="eyebrow">
                    MEETING WORKSPACE
                  </span>

                  <h1>Welcome back!</h1>

                  <p>
                    Create clear and organized meeting minutes
                    from your recordings.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={startNewMeeting}
                >
                  + Create New MOM
                </button>

              </div>

              {/* DASHBOARD OVERVIEW */}
              <div className="overview-grid">

                <div className="overview-card">
                  <div className="overview-icon">▤</div>

                  <div>
                    <span>Total Meetings</span>
                    <h2>{meetings.length}</h2>
                    <small>Generated this session</small>
                  </div>
                </div>

                <div className="overview-card">
                  <div className="overview-icon">✦</div>

                  <div>
                    <span>Meeting Assistant</span>
                    <h2>Ready</h2>
                    <small>Upload a recording to get started</small>
                  </div>
                </div>

              </div>

              {/* RECENT MEETINGS */}
              <div className="section-heading">

                <div>
                  <h2>Recent Meetings</h2>
                  <p>
                    Your recently generated meeting minutes.
                  </p>
                </div>

                <button
                  className="text-button"
                  onClick={() => setPage("history")}
                >
                  View all →
                </button>

              </div>

              {meetings.length === 0 ? (

                <div className="empty-state">

                  <div className="empty-icon">▤</div>

                  <h3>No meetings yet</h3>

                  <p>
                    Your generated meeting minutes will appear here.
                  </p>

                  <button
                    className="primary-button"
                    onClick={startNewMeeting}
                  >
                    Upload Recording
                  </button>

                </div>

              ) : (

                <div className="meeting-list">

                  {meetings.slice(0, 4).map((meeting, index) => (

                    <div className="meeting-row" key={index}>

                      <div className="meeting-file-icon">♫</div>

                      <div className="meeting-info">
                        <strong>
                          {meeting.filename || "Meeting Recording"}
                        </strong>

                        <span>
                          {meeting.language || "Meeting minutes generated"}
                        </span>
                      </div>

                      <button
                        className="text-button"
                        onClick={() => openMeeting(meeting)}
                      >
                        View →
                      </button>

                    </div>

                  ))}

                </div>

              )}

            </section>
          )}

          {/* NEW MEETING */}
          {page === "new" && (
            <section className="upload-page">

              <div className="page-heading">

                <span className="eyebrow">
                  NEW DOCUMENT
                </span>

                <h1>Create Meeting Minutes</h1>

                <p>
                  Upload your meeting recording to generate
                  structured meeting minutes.
                </p>

              </div>

              <div className="upload-card">

                <div className="upload-heading">
                  <h2>Upload Recording</h2>

                  <p>
                    Choose an audio or video recording from your device.
                  </p>
                </div>

                {/* FILE UPLOAD */}
                <label
                  htmlFor="meetingFile"
                  className={`upload-box ${file ? "file-selected" : ""}`}
                >

                  <div className="upload-icon">
                    ↑
                  </div>

                  <h3>
                    {file
                      ? file.name
                      : "Select your meeting recording"}
                  </h3>

                  <p>
                    Click here to browse files
                  </p>

                  <span>
                    MP3 · WAV · M4A · MP4 · MOV
                  </span>

                </label>

                <input
                  id="meetingFile"
                  type="file"
                  accept="audio/*,video/*"
                  onChange={(event) => {
                    setFile(event.target.files[0] || null);
                    setError("");
                    setResult(null);
                  }}
                />

                {/* SELECTED FILE INFORMATION */}
                {file && (
                  <div className="selected-file">
                    <div className="selected-file-icon">✓</div>

                    <div className="selected-file-info">
                      <strong>File selected</strong>
                      <span>{file.name}</span>
                    </div>

                    <button
                      className="remove-file"
                      onClick={() => {
                        setFile(null);
                        setError("");
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* ERROR MESSAGE */}
                {error && (
                  <p className="error-message" role="alert">
                    {error}
                  </p>
                )}

                {/* GENERATE BUTTON */}
                <button
                  className="primary-button generate-button"
                  onClick={generateMOM}
                  disabled={!file || loading}
                >
                  {loading
                    ? "Generating Meeting Minutes..."
                    : "Generate Meeting Minutes →"}
                </button>

                {loading && (
                  <p className="loading-message">
                    Please wait while your recording is being processed.
                  </p>
                )}

              </div>

            </section>
          )}

          {/* MY MEETINGS */}
          {page === "history" && (
            <section>

              <div className="page-heading">

                <span className="eyebrow">
                  YOUR RECORDS
                </span>

                <h1>My Meetings</h1>

                <p>
                  View your generated meeting minutes.
                </p>

              </div>

              {meetings.length === 0 ? (

                <div className="empty-state">

                  <div className="empty-icon">◷</div>

                  <h3>No meetings yet</h3>

                  <p>
                    Your generated meeting minutes will appear here
                    during this session.
                  </p>

                  <button
                    className="primary-button"
                    onClick={startNewMeeting}
                  >
                    Create Meeting
                  </button>

                </div>

              ) : (

                <div className="meeting-list">

                  {meetings.map((meeting, index) => (

                    <div className="meeting-row" key={index}>

                      <div className="meeting-file-icon">♫</div>

                      <div className="meeting-info">
                        <strong>
                          {meeting.filename || "Meeting Recording"}
                        </strong>

                        <span>
                          {meeting.language || "Meeting minutes generated"}
                        </span>
                      </div>

                      <button
                        className="text-button"
                        onClick={() => openMeeting(meeting)}
                      >
                        View Minutes →
                      </button>

                    </div>

                  ))}

                </div>

              )}

            </section>
          )}

          {/* MEETING DETAILS */}
          {page === "details" && result && (
            <section>

              <div className="page-heading">

                <span className="eyebrow">
                  GENERATED REPORT
                </span>

                <h1>Meeting Report</h1>

                <p>{result.filename}</p>

              </div>

              <MeetingReport result={result} />

              <button
                className="secondary-button"
                onClick={startNewMeeting}
              >
                + Create Another Meeting
              </button>

            </section>
          )}

        </div>

        {/* FOOTER */}
        <footer className="footer">
          MOM Summarizer
        </footer>

      </main>

    </div>
  );
}

export default App;