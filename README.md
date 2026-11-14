# MOM Summarizer 🎙️

An AI-powered Meeting Minutes (MOM) Summarizer that converts audio and video meeting recordings into structured meeting reports.

## 📌 About the Project

MOM Summarizer is an academic micro-project developed to simplify the process of preparing Minutes of Meetings. Instead of manually listening to long recordings and writing meeting notes, users can upload an audio or video recording and generate a summarized meeting report.

## ✨ Features

- **User Authentication:** Secure login and signup using Firebase Authentication.
- **Audio Upload:** Upload meeting recordings in supported audio formats.
- **Video Upload:** Upload video recordings for meeting processing.
- **Speech-to-Text:** Convert meeting audio into text using Faster-Whisper.
- **AI-Based Summarization:** Generate concise meeting summaries using FLAN-T5.
- **Structured MOM Report:** Organize meeting information into meaningful sections.
- **Meeting Dashboard:** Access the meeting generation interface and view generated reports.

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| Python | Backend development |
| Flask | Backend API |
| React.js | Frontend development |
| Vite | Frontend development server |
| Firebase Authentication | User authentication |
| Faster-Whisper | Speech recognition |
| FLAN-T5 | Text summarization |
| CSS | User interface styling |

## 📂 Project Structure

```text
MOM-SUMMARIZER/
│
├── backend/
│   ├── app.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── MeetingReport.jsx
│   │   └── MeetingReport.css
│   └── package.json
│
├── .gitignore
└── README.md
```

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/nanawarejanhavi24-del/MOM-SUMMERIZER.git
```

### 2. Open the Project Folder

```bash
cd MOM-SUMMARIZER
```

### 3. Set Up the Backend

Create and activate a Python virtual environment:

```bash
python -m venv venv
```

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```bash
pip install -r backend/requirements.txt
```

Configure Firebase Admin credentials securely before starting the backend.

Run the backend:

```bash
python backend/app.py
```

The backend runs at:

`http://127.0.0.1:5000`

### 4. Set Up the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your browser.

## 🔐 Security Note

Firebase service account credentials and environment files are not included in this repository. Configure your own credentials locally before running the project. Never upload private keys, passwords, or API secrets to GitHub.

## 🎓 Project Information

**Project Name:** MOM Summarizer  
**Project Type:** Academic Micro-Project  
**Domain:** Artificial Intelligence and Machine Learning

---

Developed as an academic project to make meeting documentation easier, faster, and more organized.