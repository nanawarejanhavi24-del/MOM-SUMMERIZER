
import React from "react";
import "./MeetingReport.css";

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(formatValue).join(", ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, val]) => {
        if (val === null || val === undefined || val === "") return null;

        const label = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());

        return `${label}: ${formatValue(val)}`;
      })
      .filter(Boolean)
      .join(" | ");
  }

  return String(value);
};

const formatList = (items) => {
  if (!Array.isArray(items)) {
    return items ? [formatValue(items)] : [];
  }

  return items
    .map(formatValue)
    .filter((item) => item && item !== "Not available");
};

// Split transcript into individual sentences.
const formatTranscript = (transcript) => {
  if (!transcript || !transcript.trim()) {
    return [];
  }

  return transcript
    .split(/(?<=[.!?।॥])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence) => sentence.replace(/^\d+[\.)]\s*/, ""));
};

// Identify possible decisions using existing key points.
const getDecisions = (keyPoints) => {
  const keywords =
    /\b(decided|approved|agreed|confirmed|resolved|finalized|selected|will proceed|decision)\b/i;

  return formatList(keyPoints).filter((point) =>
    keywords.test(point)
  );
};

const MeetingReport = ({ result }) => {
  if (!result) return null;

  const filename = result.filename || "Meeting";
  const language = result.language || "Not available";

  const summary = formatValue(result.summary);
  const keyPoints = formatList(result.key_points);
  const actionItems = formatList(result.action_items);
  const decisions = getDecisions(result.key_points);

  const transcript =
    result.transcript || "Transcript not available.";

  const transcriptLines = formatTranscript(transcript);

  const reportDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const reportText = `
MINUTES OF MEETING
OFFICIAL MEETING RECORD

1. MEETING DETAILS

Meeting File: ${filename}
Language: ${language}
Report Prepared On: ${reportDate}

2. EXECUTIVE SUMMARY

${summary}

3. DISCUSSION SUMMARY

${
  keyPoints.length
    ? keyPoints.map((point, index) => `${index + 1}. ${point}`).join("\n")
    : "No discussion points available."
}

4. DECISIONS AND RESOLUTIONS

${
  decisions.length
    ? decisions.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "No specific decisions identified in the available discussion points."
}

5. ACTION ITEMS

${
  actionItems.length
    ? actionItems.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "No action items available."
}

6. MEETING TRANSCRIPT

${
  transcriptLines.length
    ? transcriptLines.map((line, index) => `${index + 1}. ${line}`).join("\n")
    : "Transcript not available."
}

----------------------------------------
Generated using MOM Summarizer
  `.trim();

  // Download TXT
  const downloadTXT = () => {
    const blob = new Blob([reportText], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "Meeting-Minutes-Report.txt";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // Print or save as PDF
  const downloadPDF = () => {
    const previousTitle = document.title;

    document.title = "Meeting-Minutes-Report";

    window.addEventListener(
      "afterprint",
      () => {
        document.title = previousTitle;
      },
      { once: true }
    );

    window.print();
  };

  return (
    <div className="corporate-report-container">

      {/* REPORT TOOLBAR */}

      <div className="corporate-toolbar">
        <div>
          <h2>Meeting Minutes</h2>
          <p>Official corporate meeting record</p>
        </div>

        <div className="corporate-downloads">
          <button onClick={downloadTXT} className="txt-button">
            Download TXT
          </button>

          <button onClick={downloadPDF} className="pdf-button">
            Download PDF
          </button>
        </div>
      </div>

      {/* REPORT DOCUMENT */}

      <article className="corporate-report-print">

        <header className="corporate-report-header">
          <div className="corporate-header-top">
            <span>MOM SUMMARIZER</span>
            <span>MEETING DOCUMENTATION</span>
          </div>

          <div className="corporate-header-title">
            <h1>MINUTES OF MEETING</h1>
            <p>Official Meeting Record</p>
          </div>

          <div className="corporate-report-meta">
            <div>
              <span>MEETING FILE</span>
              <strong>{filename}</strong>
            </div>

            <div>
              <span>LANGUAGE</span>
              <strong>{language}</strong>
            </div>

            <div>
              <span>REPORT PREPARED ON</span>
              <strong>{reportDate}</strong>
            </div>
          </div>
        </header>

        {/* 1. MEETING DETAILS */}

        <section className="corporate-section">
          <h2>
            <span>01</span>
            Meeting Details
          </h2>

          <table className="corporate-table">
            <tbody>
              <tr>
                <th>Meeting File</th>
                <td>{filename}</td>
              </tr>

              <tr>
                <th>Detected Language</th>
                <td>{language}</td>
              </tr>

              <tr>
                <th>Report Prepared On</th>
                <td>{reportDate}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 2. EXECUTIVE SUMMARY */}

        <section className="corporate-section">
          <h2>
            <span>02</span>
            Executive Summary
          </h2>

          <p>{summary}</p>
        </section>

        {/* 3. DISCUSSION SUMMARY */}

        <section className="corporate-section">
          <h2>
            <span>03</span>
            Discussion Summary
          </h2>

          {keyPoints.length > 0 ? (
            <ol>
              {keyPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ol>
          ) : (
            <p>No discussion points available.</p>
          )}
        </section>

        {/* 4. DECISIONS */}

        <section className="corporate-section">
          <h2>
            <span>04</span>
            Decisions and Resolutions
          </h2>

          {decisions.length > 0 ? (
            <ol>
              {decisions.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          ) : (
            <p>
              No specific decisions were identified in the
              available discussion points.
            </p>
          )}
        </section>

        {/* 5. ACTION ITEMS */}

        <section className="corporate-section">
          <h2>
            <span>05</span>
            Action Items
          </h2>

          {actionItems.length > 0 ? (
            <ol>
              {actionItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          ) : (
            <p>No action items available.</p>
          )}
        </section>

        {/* 6. TRANSCRIPT */}

        <section className="corporate-section">
          <h2>
            <span>06</span>
            Meeting Transcript
          </h2>

          {transcriptLines.length > 0 ? (
            <div className="corporate-transcript">
              {transcriptLines.map((line, index) => (
                <div
                  className="corporate-transcript-row"
                  key={index}
                >
                  <span className="corporate-transcript-number">
                    {index + 1}.
                  </span>

                  <span className="corporate-transcript-text">
                    {line}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p>Transcript not available.</p>
          )}
        </section>

        <footer className="corporate-footer">
          <span>MOM Summarizer</span>
          <span>Official Meeting Record</span>
        </footer>

      </article>
    </div>
  );
};

export default MeetingReport;
