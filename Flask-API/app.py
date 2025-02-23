from flask import Flask, jsonify, request
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, InvalidVideoId
# from config import API_KEY  # Assuming API_KEY is your Groq API key or adjust accordingly
from flask_cors import CORS
import logging

# Your Groq API key
GROQ_API_KEY = "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"

# Import Groq client (make sure the Groq client library is installed and imported correctly)
from groq import Groq  # Replace with the actual import if different

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)

app = Flask(__name__)
CORS(app)
# CORS(app, resources={r"/summary": {"origins": "https://summarizeyoutube.netlify.app/"}})

@app.route('/summary', methods=['GET'])
def youtube_summarizer():
    video_id = request.args.get('v')
    try:
        transcript = get_transcript(video_id)
        # Use the groq_ai function to generate a summary
        data = groq_ai(transcript)
    except NoTranscriptFound:
        return jsonify({"data": "No English Subtitles found", "error": True})
    except InvalidVideoId:
        return jsonify({"data": "Invalid Video Id", "error": True})
    except Exception as e:
        logging.error("Error summarizing video: %s", str(e))
        return jsonify({"data": "Unable to Summarize the video", "error": True})

    # Return the generated summary; adjust the access if the structure of data is different.
    return jsonify({"data": data, "error": False})

def get_transcript(video_id):
    transcript_response = YouTubeTranscriptApi.get_transcript(video_id)
    transcript_list = [item['text'] for item in transcript_response]
    return ' '.join(transcript_list)

def groq_ai(transcript):
    try:
        chat_completion = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "user", "content": f"Summarize this: {transcript}"}
            ]
        )
        # Assuming the structure of response is similar to OpenAI's API
        summary = chat_completion.choices[0].message.content
        return summary
    except Exception as e:
        logging.error("Groq API error: %s", str(e))
        return "Error generating summary."

# Uncomment the below if you want to run the app directly.
# if __name__ == '__main__':
#     app.run(debug=True)


@app.route('/quiz', methods=['GET'])
def generate_quiz():
    video_id = request.args.get('v')
    try:
        transcript = get_transcript(video_id)
        questions = groq_generate_quiz(transcript)
        return jsonify({"questions": questions, "error": False})
    except NoTranscriptFound:
        return jsonify({"questions": [], "error": True, "message": "No English subtitles found"})
    except InvalidVideoId:
        return jsonify({"questions": [], "error": True, "message": "Invalid Video ID"})
    except Exception as e:
        logging.error("Error generating quiz: %s", str(e))
        return jsonify({"questions": [], "error": True, "message": "Unable to generate quiz"})
import json
import re

def groq_generate_quiz(transcript):
    try:
        prompt = f"""
Generate 4 multiple-choice questions based on the following transcript:
{transcript}

Each question must meet the following criteria:
- **Must have exactly 4 answer choices**.
- **The "correctAnswer" field must contain the FULL TEXT of the correct answer (not just "A", "B", etc.).**
- **Do not add any extra text before or after the JSON output. Only return valid JSON.**

Here is the exact JSON format you must follow:
[
    {{
        "question": "What is the capital of France?",
        "options": [
            "Berlin",
            "Madrid",
            "Paris",
            "Rome"
        ],
        "correctAnswer": "Paris"
    }},
    {{
        "question": "Which element has the chemical symbol O?",
        "options": [
            "Oxygen",
            "Gold",
            "Silver",
            "Hydrogen"
        ],
        "correctAnswer": "Oxygen"
    }},
    {{
        "question": "What is the largest planet in the solar system?",
        "options": [
            "Earth",
            "Mars",
            "Jupiter",
            "Venus"
        ],
        "correctAnswer": "Jupiter"
    }},
    {{
        "question": "Who developed the theory of relativity?",
        "options": [
            "Isaac Newton",
            "Albert Einstein",
            "Galileo Galilei",
            "Nikola Tesla"
        ],
        "correctAnswer": "Albert Einstein"
    }}
]
"""


        chat_completion = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": prompt}]
        )

        # Get the raw AI response
        quiz_data = chat_completion.choices[0].message.content.strip()
        logging.info("Groq API raw quiz output: %s", quiz_data)

        # Extract JSON using regex to remove any surrounding text
        match = re.search(r"\[.*\]", quiz_data, re.DOTALL)
        if match:
            quiz_data = match.group(0)  # Extract only the JSON part

        # Parse the cleaned JSON data
        questions = json.loads(quiz_data)
        return questions

    except json.JSONDecodeError as e:
        logging.error("JSON parsing error: %s", str(e))
        return []

    except Exception as e:
        logging.error("Groq API quiz error: %s", str(e))
        return []
