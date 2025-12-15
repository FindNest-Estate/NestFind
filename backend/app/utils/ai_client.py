import requests
import json
import logging

logger = logging.getLogger(__name__)

OLLAMA_API_URL = "http://localhost:11434/api/generate"

def generate_text(model: str, prompt: str, system_prompt: str = None) -> str:
    """
    Generates text using a local Ollama model.
    """
    try:
        full_prompt = prompt
        if system_prompt:
            # Some models support system prompts differently, but for simplicity we'll prepend it
            # or use the template if the model supports it. 
            # For raw generation, prepending is often enough for instruction tuned models.
            full_prompt = f"System: {system_prompt}\n\nUser: {prompt}"

        payload = {
            "model": model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": 0.7
            }
        }
        
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        return result.get("response", "")
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Ollama API request failed: {e}")
        return f"Error generating text: {str(e)}"
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")
        return "An unexpected error occurred while generating text."
