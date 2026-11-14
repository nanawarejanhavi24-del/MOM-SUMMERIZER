
import os
import re
import tempfile
import shutil
import wave

import av
import firebase_admin
import torch

from firebase_admin import credentials
from firebase_admin import auth as firebase_auth

from flask import Flask, jsonify, request
from flask_cors import CORS

from faster_whisper import WhisperModel

from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM
)


# ==================================================
# 1. FLASK CONFIGURATION
# ==================================================

app = Flask(__name__)

CORS(app)

app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# ==================================================
# 2. FIREBASE ADMIN INITIALIZATION
# ==================================================

SERVICE_ACCOUNT_PATH = os.path.join(
    BASE_DIR,
    "serviceAccountKey.json"
)

if not firebase_admin._apps:

    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        raise FileNotFoundError(
            "serviceAccountKey.json not found in backend folder."
        )

    firebase_credentials = credentials.Certificate(
        SERVICE_ACCOUNT_PATH
    )

    firebase_admin.initialize_app(firebase_credentials)

print("Firebase Admin initialized successfully!")


# ==================================================
# 3. FIREBASE TOKEN VERIFICATION
# ==================================================

def verify_firebase_token():

    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):

        return None, (
            jsonify({
                "status": "error",
                "message": "Authentication token missing."
            }),
            401
        )

    id_token = auth_header.split(" ", 1)[1].strip()

    if not id_token:

        return None, (
            jsonify({
                "status": "error",
                "message": "Authentication token missing."
            }),
            401
        )

    try:

        decoded_token = firebase_auth.verify_id_token(id_token)

        return decoded_token, None

    except Exception:

        app.logger.exception(
            "Firebase token verification failed"
        )

        return None, (
            jsonify({
                "status": "error",
                "message": "Invalid or expired authentication token."
            }),
            401
        )


# ==================================================
# 4. FASTER-WHISPER MODEL
# ==================================================

whisper_model = None


def get_model():

    global whisper_model

    if whisper_model is None:

        print("Loading Faster-Whisper model...")

        whisper_model = WhisperModel(
            "base",
            device="cpu",
            compute_type="int8"
        )

        print("Whisper model loaded successfully!")

    return whisper_model


# ==================================================
# 5. FLAN-T5 MODEL
# ==================================================

flan_tokenizer = None
flan_model = None

FLAN_MODEL_NAME = "google/flan-t5-small"


def get_flan_model():

    global flan_tokenizer, flan_model

    if flan_model is None:

        print("Loading FLAN-T5 model...")

        flan_tokenizer = AutoTokenizer.from_pretrained(
            FLAN_MODEL_NAME
        )

        flan_model = AutoModelForSeq2SeqLM.from_pretrained(
            FLAN_MODEL_NAME
        )

        flan_model.eval()

        print("FLAN-T5 model loaded successfully!")

    return flan_tokenizer, flan_model


def generate_ai_text(prompt, max_new_tokens=100):

    tokenizer, model = get_flan_model()

    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        max_length=512,
        truncation=True
    )

    with torch.no_grad():

        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            num_beams=2,
            no_repeat_ngram_size=2
        )

    result = tokenizer.decode(
        outputs[0],
        skip_special_tokens=True
    )

    return result.strip()


def generate_ai_summary(transcript):

    prompt = (
        "Write a clear and meaningful executive summary "
        "of this meeting in 2 or 3 sentences. "
        "Explain the main purpose, important discussions "
        "and outcomes. Include important dates or budget "
        "only when clearly mentioned. Do not invent facts. "
        "Use professional and simple language.\n\n"
        "Meeting transcript:\n"
        + transcript
    )

    try:

        summary = generate_ai_text(
            prompt,
            max_new_tokens=120
        )

        if summary:
            return summary

    except Exception:

        app.logger.exception(
            "FLAN-T5 executive summary generation failed"
        )

    # Fallback if AI generation fails

    sentences = re.split(
        r'(?<=[.!?])\s+',
        transcript.strip()
    )

    return " ".join(sentences[:3])


def generate_topic_summary(topic, discussion_text):

    prompt = (
        "Summarize this meeting discussion under the topic "
        + topic
        + ". Write 1 or 2 concise sentences containing "
        "the important information. Do not invent facts.\n\n"
        "Discussion:\n"
        + discussion_text
    )

    return generate_ai_text(
        prompt,
        max_new_tokens=65
    )


# ==================================================
# 6. HOME ROUTE
# ==================================================

@app.route("/")
def home():

    return "MOM Summarizer Backend is Running!"


# ==================================================
# 7. HEALTH CHECK API
# ==================================================

@app.route("/api/health", methods=["GET"])
def health():

    return jsonify({
        "status": "success",
        "message": "MOM Summarizer backend is running!",
        "mom_generator": "FLAN-T5 + Python"
    })


# ==================================================
# 8. FIREBASE AUTHENTICATION TEST API
# ==================================================

@app.route("/api/auth-check", methods=["GET"])
def auth_check():

    decoded_token, error_response = verify_firebase_token()

    if error_response:
        return error_response

    return jsonify({
        "status": "success",
        "message": "Firebase authentication successful!",
        "user_id": decoded_token["uid"],
        "email": decoded_token.get("email")
    })


# ==================================================
# 9. VIDEO AUDIO EXTRACTION
# ==================================================

def extract_video_audio(input_path, audio_path):

    """Extract mono, 16 kHz WAV audio from a video."""

    container = av.open(input_path)

    try:

        audio_stream = next(
            (
                stream for stream in container.streams
                if stream.type == "audio"
            ),
            None
        )

        if audio_stream is None:

            raise ValueError(
                "No audio stream found in this video."
            )

        resampler = av.AudioResampler(
            format="s16",
            layout="mono",
            rate=16000
        )

        with wave.open(audio_path, "wb") as wav:

            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(16000)

            for frame in container.decode(audio_stream):

                for audio in resampler.resample(frame):

                    wav.writeframes(
                        audio.to_ndarray().tobytes()
                    )

            for audio in resampler.resample(None):

                wav.writeframes(
                    audio.to_ndarray().tobytes()
                )

    finally:

        container.close()

    if (
        not os.path.exists(audio_path)
        or os.path.getsize(audio_path) <= 44
    ):

        raise ValueError(
            "Could not extract audio from this video."
        )


# ==================================================
# 10. STRUCTURED MOM GENERATOR
# ==================================================

def generate_structured_mom(transcript):

    text = transcript.strip()

    sentences = re.split(
        r'(?<=[.!?])\s+',
        text
    )

    sentences = [
        sentence.strip()
        for sentence in sentences
        if sentence.strip()
    ]

    lower_text = text.lower()


    # --------------------------------------------------
    # MEETING TITLE
    # --------------------------------------------------

    if "application" in lower_text and "launch" in lower_text:

        meeting_title = "Mobile Application Launch Meeting"

    elif "marketing" in lower_text:

        meeting_title = "Marketing Strategy Meeting"

    elif "project" in lower_text:

        meeting_title = "Project Discussion Meeting"

    else:

        meeting_title = "General Meeting"


    # --------------------------------------------------
    # MEETING PURPOSE
    # --------------------------------------------------

    purpose = "Not specified"

    purpose_keywords = [
        "main purpose",
        "purpose of this meeting",
        "meeting is to discuss",
        "objective of this meeting"
    ]

    for sentence in sentences:

        if any(
            keyword in sentence.lower()
            for keyword in purpose_keywords
        ):

            purpose = sentence
            break


    # --------------------------------------------------
    # TOPIC-WISE DISCUSSION
    # --------------------------------------------------

    topics = {

        "Marketing Strategy": [
            "marketing",
            "social media",
            "instagram",
            "linkedin",
            "youtube",
            "advertisement",
            "promotion"
        ],

        "Budget Discussion": [
            "budget",
            "expenses",
            "spending",
            "rupees",
            "cost",
            "allocation"
        ],

        "Creative Design Planning": [
            "creative",
            "design",
            "video production",
            "branding",
            "banner"
        ],

        "Influencer Collaborations": [
            "influencer",
            "collaboration"
        ],

        "Application Testing": [
            "testing",
            "android",
            "ios",
            "development team"
        ],

        "Campaign Schedule": [
            "launch",
            "campaign",
            "teaser",
            "demonstration",
            "november",
            "december",
            "timeline"
        ]

    }

    agenda = []

    key_points = []

    for topic, keywords in topics.items():

        relevant_sentences = [

            sentence
            for sentence in sentences
            if any(
                keyword in sentence.lower()
                for keyword in keywords
            )

        ]

        if not relevant_sentences:
            continue

        agenda.append(topic)

        discussion_text = " ".join(
            relevant_sentences
        )

        try:

            print(
                "Generating discussion summary:",
                topic
            )

            topic_summary = generate_topic_summary(
                topic,
                discussion_text
            )

            if not topic_summary:

                topic_summary = discussion_text

        except Exception:

            app.logger.exception(
                "Topic summary failed: " + topic
            )

            topic_summary = discussion_text

        key_points.append(
            topic + ": " + topic_summary
        )


    # --------------------------------------------------
    # EXECUTIVE SUMMARY
    # --------------------------------------------------

    print("Generating executive summary using FLAN-T5...")

    summary = generate_ai_summary(text)


    # --------------------------------------------------
    # DECISIONS
    # --------------------------------------------------

    decisions = []

    decision_keywords = [

        "agreed",
        "approved",
        "decided",
        "finalized",
        "will make sure",
        "will ensure",
        "must ensure",
        "must be completed"

    ]

    for sentence in sentences:

        if any(
            keyword in sentence.lower()
            for keyword in decision_keywords
        ):

            if sentence not in decisions:

                decisions.append(sentence)


    # --------------------------------------------------
    # ACTION ITEMS
    # --------------------------------------------------

    action_items = []

    action_pattern = re.compile(
        r'\b([A-Za-z][a-zA-Z]*(?:\s+team)?)'
        r'\s+(?:will|should|must|needs to|has to)\s+'
        r'([^.!?]+)',
        re.IGNORECASE
    )

    for sentence in sentences:

        matches = action_pattern.findall(sentence)

        for person, task_text in matches:

            person = person.strip()

            if person.lower() in [
                "we",
                "i",
                "they",
                "he",
                "she"
            ]:
                continue

            task_text = task_text.strip()

            deadline = "Not specified"

            deadline_match = re.search(
                r'\b(?:by|before|until)\s+(.+?)$',
                task_text,
                re.IGNORECASE
            )

            task = task_text

            if deadline_match:

                deadline = deadline_match.group(1).strip()

                task = task_text[
                    :deadline_match.start()
                ].strip()

            if task:

                action_items.append({

                    "task": task,

                    "responsible_person": person,

                    "deadline": deadline,

                    "status": "Pending"

                })


    # Remove duplicate action items

    unique_actions = []

    seen_actions = set()

    for item in action_items:

        key = (
            item["task"].lower(),
            item["responsible_person"].lower()
        )

        if key not in seen_actions:

            unique_actions.append(item)

            seen_actions.add(key)

    action_items = unique_actions


    # --------------------------------------------------
    # BUDGET EXTRACTION
    # --------------------------------------------------

    budget = []

    budget_pattern = re.compile(
        r'(?:₹|rs\.?\s*)'
        r'([\d,]+)\s*'
        r'(?:for\s+)?'
        r'([^,.;\n]*)',
        re.IGNORECASE
    )

    for match in budget_pattern.finditer(text):

        amount = match.group(1).strip()

        activity = match.group(2).strip(" :")

        if not activity:
            continue

        budget.append({

            "activity": activity.title(),

            "amount": "₹" + amount,

            "notes": "Mentioned in meeting"

        })


    # --------------------------------------------------
    # IMPORTANT DATES
    # --------------------------------------------------

    month_names = (
        "January|February|March|April|May|June|"
        "July|August|September|October|November|December|"
        "Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec"
    )

    date_pattern = re.compile(
        r'\b\d{1,2}(?:st|nd|rd|th)?\s+'
        r'(?:' + month_names + r')\b',
        re.IGNORECASE
    )

    important_dates = []

    for sentence in sentences:

        dates = date_pattern.findall(sentence)

        for date in dates:

            important_dates.append({

                "date": date,

                "event": sentence

            })


    # General date references

    general_dates = [

        ("first week of december", "First week of December"),

        ("second week of december", "Second week of December"),

        ("third week of december", "Third week of December"),

        ("last week of december", "Last week of December"),

        ("end of december", "End of December")

    ]

    for keyword, date_label in general_dates:

        if keyword in lower_text:

            important_dates.append({

                "date": date_label,

                "event": "Date mentioned in meeting"

            })


    # Remove duplicate dates

    unique_dates = []

    seen_dates = set()

    for item in important_dates:

        key = (
            item["date"].lower(),
            item["event"].lower()
        )

        if key not in seen_dates:

            unique_dates.append(item)

            seen_dates.add(key)

    important_dates = unique_dates


    # --------------------------------------------------
    # MEETING DETAILS
    # --------------------------------------------------

    next_meeting = "Not specified"

    for sentence in sentences:

        if "next review meeting" in sentence.lower():

            next_meeting = sentence

            break

    meeting_details = {

        "meeting_title": meeting_title,

        "meeting_date": "Not specified",

        "meeting_time": "Not specified",

        "participants": [],

        "meeting_purpose": purpose,

        "next_meeting": next_meeting

    }


    # --------------------------------------------------
    # CONCLUSION
    # --------------------------------------------------

    conclusion = (
        "The meeting concluded after reviewing "
        "the discussion points and responsibilities."
    )

    for sentence in reversed(sentences):

        if any(
            keyword in sentence.lower()
            for keyword in [
                "conclude",
                "concluded",
                "thank you",
                "next review meeting"
            ]
        ):

            conclusion = sentence
            break


    # --------------------------------------------------
    # RETURN MOM DATA
    # --------------------------------------------------

    return {

        "meeting_details": meeting_details,

        "summary": summary,

        "agenda": agenda,

        "key_points": key_points,

        "decisions": decisions,

        "action_items": action_items,

        "budget": budget,

        "important_dates": important_dates,

        "conclusion": conclusion

    }


# ==================================================
# 11. NORMALIZE MEETING MINUTES
# ==================================================

def normalize_mom(data):

    details = data.get("meeting_details", {})

    if not isinstance(details, dict):
        details = {}


    def get_list(key):

        value = data.get(key, [])

        if not isinstance(value, list):
            return []

        return value


    def get_text(value, default="Not specified"):

        if value is None:
            return default

        value = str(value).strip()

        return value if value else default


    # Clean action items

    clean_actions = []

    for item in get_list("action_items"):

        if not isinstance(item, dict):
            continue

        clean_actions.append({

            "task": get_text(
                item.get("task"), ""
            ),

            "responsible_person": get_text(
                item.get("responsible_person")
            ),

            "deadline": get_text(
                item.get("deadline")
            ),

            "status": get_text(
                item.get("status"),
                "Pending"
            )

        })


    # Clean budget

    clean_budget = []

    for item in get_list("budget"):

        if not isinstance(item, dict):
            continue

        clean_budget.append({

            "activity": get_text(
                item.get("activity"), ""
            ),

            "amount": get_text(
                item.get("amount"), ""
            ),

            "notes": get_text(
                item.get("notes"), ""
            )

        })


    # Clean important dates

    clean_dates = []

    for item in get_list("important_dates"):

        if not isinstance(item, dict):
            continue

        clean_dates.append({

            "date": get_text(
                item.get("date"), ""
            ),

            "event": get_text(
                item.get("event"), ""
            )

        })


    participants = details.get("participants", [])

    if not isinstance(participants, list):
        participants = []


    meeting_details = {

        "meeting_title": get_text(
            details.get("meeting_title")
        ),

        "meeting_date": get_text(
            details.get("meeting_date")
        ),

        "meeting_time": get_text(
            details.get("meeting_time")
        ),

        "participants": [
            str(person)
            for person in participants
        ],

        "meeting_purpose": get_text(
            details.get("meeting_purpose")
        ),

        "next_meeting": get_text(
            details.get("next_meeting")
        )

    }


    return {

        "meeting_details": meeting_details,

        "summary": get_text(
            data.get("summary"), ""
        ),

        "agenda": get_list("agenda"),

        "key_points": get_list("key_points"),

        "decisions": get_list("decisions"),

        "action_items": clean_actions,

        "budget": clean_budget,

        "important_dates": clean_dates,

        "conclusion": get_text(
            data.get("conclusion"), ""
        )

    }


# ==================================================
# 12. GENERATE MEETING MINUTES API
# ==================================================

@app.route("/api/generate", methods=["POST"])
def generate_mom():

    # Verify Firebase authentication

    decoded_token, error_response = verify_firebase_token()

    if error_response:
        return error_response

    user_id = decoded_token["uid"]


    # Check uploaded file

    if "file" not in request.files:

        return jsonify({

            "status": "error",

            "error": "Please upload an audio or video file."

        }), 400


    uploaded_file = request.files["file"]

    if not uploaded_file.filename:

        return jsonify({

            "status": "error",

            "error": "No file selected."

        }), 400


    filename = os.path.basename(
        uploaded_file.filename
    )

    extension = os.path.splitext(filename)[1].lower()


    audio_extensions = {

        ".mp3",
        ".wav",
        ".m4a",
        ".mpga",
        ".ogg",
        ".flac"

    }

    video_extensions = {

        ".mp4",
        ".mov",
        ".avi",
        ".mkv",
        ".webm",
        ".mpeg"

    }

    allowed_extensions = (
        audio_extensions | video_extensions
    )


    if extension not in allowed_extensions:

        return jsonify({

            "status": "error",

            "error": "Unsupported file type."

        }), 400


    temp_dir = tempfile.mkdtemp(
        prefix="mom_"
    )

    input_path = os.path.join(
        temp_dir,
        "input" + extension
    )

    audio_path = input_path


    try:

        # Save uploaded file

        uploaded_file.save(input_path)


        # Extract audio from video

        if extension in video_extensions:

            audio_path = os.path.join(
                temp_dir,
                "audio.wav"
            )

            extract_video_audio(
                input_path,
                audio_path
            )


        # Load Whisper model

        whisper = get_model()

        print("Starting audio transcription...")


        segments, info = whisper.transcribe(
            audio_path,
            beam_size=5
        )


        transcript = " ".join(

            segment.text.strip()

            for segment in segments

        ).strip()


        if not transcript:

            return jsonify({

                "status": "error",

                "error": "No speech was detected in this file."

            }), 400


        print("Transcription completed!")


        # Generate MOM using FLAN-T5 and Python

        print(
            "Generating meeting minutes using FLAN-T5 + Python..."
        )

        mom_data = generate_structured_mom(
            transcript
        )

        meeting_minutes = normalize_mom(
            mom_data
        )

        print("Meeting minutes generated successfully!")


        # Legacy-compatible action item strings

        action_item_strings = [

            item["task"]

            for item in meeting_minutes["action_items"]

        ]


        # Return complete result

        return jsonify({

            "status": "success",

            "user_id": user_id,

            "filename": filename,

            "language": info.language,

            "transcript": transcript,

            "meeting_minutes": meeting_minutes,

            "meeting_details": meeting_minutes["meeting_details"],

            "summary": meeting_minutes["summary"],

            "agenda": meeting_minutes["agenda"],

            "key_points": meeting_minutes["key_points"],

            "decisions": meeting_minutes["decisions"],

            "action_items": action_item_strings,

            "action_items_detailed": meeting_minutes["action_items"],

            "budget": meeting_minutes["budget"],

            "important_dates": meeting_minutes["important_dates"],

            "conclusion": meeting_minutes["conclusion"],

            "mom_generator": "FLAN-T5 + Python"

        })


    except ValueError as error:

        app.logger.exception(
            "MOM processing error"
        )

        return jsonify({

            "status": "error",

            "error": str(error)

        }), 400


    except Exception:

        app.logger.exception(
            "MOM generation failed"
        )

        return jsonify({

            "status": "error",

            "error": (
                "MOM generation failed. "
                "Please check the backend terminal "
                "for the detailed error."
            )

        }), 500


    finally:

        shutil.rmtree(
            temp_dir,
            ignore_errors=True
        )


# ==================================================
# 13. RUN FLASK SERVER
# ==================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )
