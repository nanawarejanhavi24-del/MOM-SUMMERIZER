
import os
import tempfile
import shutil
import wave

import av
from flask import Flask, jsonify, request
from flask_cors import CORS
from faster_whisper import WhisperModel

app = Flask(__name__)
CORS(app)

app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024

model = None


def get_model():
    global model
    if model is None:
        model = WhisperModel("base", device="cpu", compute_type="int8")
    return model


@app.route("/")
def home():
    return "MOM Summarizer Backend is Running!"


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "success",
        "message": "MOM Summarizer backend is running!"
    })


def extract_video_audio(input_path, audio_path):
    """Extract mono, 16 kHz WAV audio from a video using PyAV."""
    container = av.open(input_path)

    try:
        audio_stream = next(
            (stream for stream in container.streams
             if stream.type == "audio"),
            None
        )

        if audio_stream is None:
            raise ValueError("No audio stream found in this video.")

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
                    wav.writeframes(audio.to_ndarray().tobytes())

            for audio in resampler.resample(None):
                wav.writeframes(audio.to_ndarray().tobytes())

    finally:
        container.close()

    if not os.path.exists(audio_path) or os.path.getsize(audio_path) <= 44:
        raise ValueError("Could not extract audio from this video.")


@app.route("/api/generate", methods=["POST"])
def generate_mom():
    if "file" not in request.files:
        return jsonify({
            "error": "Please upload an audio or video file."
        }), 400

    uploaded_file = request.files["file"]

    if not uploaded_file.filename:
        return jsonify({"error": "No file selected."}), 400

    filename = uploaded_file.filename
    extension = os.path.splitext(filename)[1].lower()

    audio_extensions = {
        ".mp3", ".wav", ".m4a", ".mpga", ".ogg", ".flac"
    }
    video_extensions = {
        ".mp4", ".mov", ".avi", ".mkv", ".webm", ".mpeg"
    }
    allowed = audio_extensions | video_extensions

    if extension not in allowed:
        return jsonify({"error": "Unsupported file type."}), 400

    temp_dir = tempfile.mkdtemp(prefix="mom_")
    input_path = os.path.join(temp_dir, "input" + extension)
    audio_path = input_path

    try:
        uploaded_file.save(input_path)

        # Only video files use PyAV extraction.
        # Existing audio-file handling remains unchanged.
        if extension in video_extensions:
            audio_path = os.path.join(temp_dir, "audio.wav")
            extract_video_audio(input_path, audio_path)

        whisper = get_model()
        segments, info = whisper.transcribe(
            audio_path,
            beam_size=5
        )

        transcript = " ".join(
            segment.text.strip() for segment in segments
        )

        if not transcript.strip():
            return jsonify({
                "error": "No speech was detected in this file."
            }), 400

        sentences = [
            part.strip()
            for part in (
                transcript.replace("!", ".")
                .replace("?", ".")
                .split(".")
            )
            if part.strip()
        ]

        summary = ". ".join(sentences[:5])
        if summary and not summary.endswith("."):
            summary += "."

        return jsonify({
            "status": "success",
            "filename": filename,
            "language": info.language,
            "transcript": transcript,
            "summary": summary,
            "key_points": sentences[:10],
            "action_items": []
        })

    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    except Exception as error:
        app.logger.exception("MOM generation failed")
        return jsonify({
            "error": (
                "Could not process this file. "
                "Please check that it is a valid audio or video file."
            )
        }), 500

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
