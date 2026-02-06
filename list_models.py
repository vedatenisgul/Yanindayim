import google.generativeai as genai
import os

# Hardcoded key for this test to ensure it uses the one we know
api_key = os.getenv("GOOGLE_API_KEY") 
# Or if that's empty in env, we might need to hardcode the one from docker-compose if env invalid.
# But let's trust os.getenv first as it should be there.

if not api_key:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

genai.configure(api_key=api_key)

print("Listing available models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"Name: {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")
