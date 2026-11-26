import logging

from google import genai
from google.genai import errors, types

from config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger("nex.ai")

client = genai.Client(api_key=GEMINI_API_KEY)

SYSTEM_INSTRUCTION = (
    "You are NeX AI, a helpful, clear, and friendly assistant. "
    "Give accurate and concise answers. "
    "If you are not sure about something, say so. "
    "Explain technical topics in simple language."
)


class AIServiceError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def generate_reply(history: list[tuple[str, str]]) -> str:
    contents = [
        types.Content(
            role="model" if role == "assistant" else "user",
            parts=[types.Part(text=text)],
        )
        for role, text in history
    ]

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=SYSTEM_INSTRUCTION),
        )
    except errors.APIError as e:
        logger.error("Gemini API error: code=%s message=%s", e.code, e.message)
        if e.code == 429:
            raise AIServiceError(
                "The AI service is busy or the free limit was reached. Please try again in a minute.",
                429,
            )
        raise AIServiceError("The AI service returned an error. Please try again.", 502)
    except Exception:
        logger.exception("Could not reach Gemini")
        raise AIServiceError("Could not reach the AI service.", 502)

    if not response.text:
        raise AIServiceError("The AI returned an empty answer. Please rephrase and try again.", 502)

    return response.text