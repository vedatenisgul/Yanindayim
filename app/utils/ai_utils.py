import google.generativeai as genai
import os
import json
import logging
import hashlib

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure API Keys
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

def generate_step_image(guide_title: str, step_title: str, step_description: str) -> str:
    """
    Generates a clean SVG vector illustration for a guide step using Gemini.
    Saves it locally and returns the static path.
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY yok. SVG üretilemedi.")
        return None

    # Create storage dir if not exists
    os.makedirs("app/static/generated", exist_ok=True)
    
    # Generate unique filename based on content
    prompt_hash = hashlib.md5(f"{step_title}{step_description}".encode()).hexdigest()
    filename = f"step_{prompt_hash}.svg"
    filepath = os.path.join("app/static/generated", filename)
    static_url = f"/static/generated/{filename}"

    # Cache check
    if os.path.exists(filepath):
        logger.info(f"SVG already exists: {static_url}")
        return static_url

    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        svg_prompt = f"""Generate a clean, minimalist SVG illustration for this guide step.

Guide: {guide_title}
Step: {step_title}
Description: {step_description}

SVG Requirements:
- Viewbox: 0 0 400 240
- Ultra-minimalist flat design, like a modern app onboarding illustration
- Use a soft, professional color palette: primary #4A90D9 (blue), secondary #6C63FF (purple-blue), accent #F5A623 (warm orange), light grays #F0F0F0, #E0E0E0
- White or very light background (#FAFAFA)
- Simple geometric shapes: rounded rectangles, circles, simple icons
- NO text elements, NO <text> tags, NO letters or words inside the SVG
- NO complex paths or detailed illustrations
- Think of it as a simple, friendly icon/illustration that represents the action
- Use thick strokes (stroke-width 2-3) for clarity
- Maximum 15-20 SVG elements to keep it clean
- The illustration should be immediately understandable by an elderly person

Return ONLY the raw SVG code starting with <svg and ending with </svg>. No markdown, no explanation, no code blocks."""

        response = model.generate_content(svg_prompt)
        svg_content = response.text.strip()
        
        # Clean up: extract just the SVG if wrapped in markdown
        if "```" in svg_content:
            # Extract content between code blocks
            lines = svg_content.split("\n")
            in_block = False
            svg_lines = []
            for line in lines:
                if line.strip().startswith("```"):
                    in_block = not in_block
                    continue
                if in_block:
                    svg_lines.append(line)
            svg_content = "\n".join(svg_lines)
        
        # Ensure it starts with <svg
        svg_start = svg_content.find("<svg")
        svg_end = svg_content.rfind("</svg>")
        if svg_start != -1 and svg_end != -1:
            svg_content = svg_content[svg_start:svg_end + 6]
        else:
            logger.error(f"SVG GEN: Invalid SVG output for '{step_title}'")
            return None
        
        # Save the SVG file
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(svg_content)
        
        logger.info(f"SVG GEN SUCCESS: {static_url} ({len(svg_content)} bytes)")
        return static_url

    except Exception as e:
        logger.error(f"SVG GEN failed for '{step_title}': {e}")
        return None

def generate_guide_with_ai(prompt: str) -> dict:
    """Generates a step-by-step guide using Gemini API with specific prompt engineering"""
    
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not found, falling back to mock data.")
        return _get_mock_guide(prompt)

    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        
        system_instruction = """
You are generating step-by-step guides for an elderly-friendly Turkish web app called “Yanındayım”.

Goal:
Create a practical, calming, real-world guide that helps a user complete a task without panic.

Audience:
Elderly users with low digital literacy. Use simple Turkish, short sentences, and reassuring tone.

Hard rules:
- Do NOT ask for or store passwords, SMS codes, T.C. numbers, or personal data.
- Do NOT pretend to control e-Devlet/MHRS/banking apps. Only guide the user.
- Each step must contain exactly ONE clear action.
- 6–12 steps per guide (prefer 8–10).
- No long paragraphs. 1–3 short sentences per step.
- Avoid technical words like “hata”, “işlem”, “debug”. Use human phrases.
- Assume screens may vary; write steps that still work if UI changes.

Output format (JSON):
{
  "title": "Use a clear, friendly title",
  "steps": [
    {
      "step_number": 1, 
      "title": "Short Step Title", 
      "description": "Clear instruction.", 
      "image_url": "/static/img/ui_app_open.png"
    }
  ],
  "help_options": ["Bende farklı görünüyor", "Devam edemiyorum", "Kod/SMS gelmedi", "Yanlış bir şeye bastım", "Başka bir sorun"]
}

Available Image URLs (Pick the best fit):
- /static/img/ui_app_open.png (Opening apps, home screens)
- /static/img/ui_login.png (Login screens, input fields)
- /static/img/ui_selection.png (Selecting items, clicking buttons)
- /static/img/ui_security.png (Passwords, security warnings)
- /static/img/ui_calendar.png (Picking dates/times)
- /static/img/ui_success.png (Completion, success screens)
- /static/img/ui_physical_visit.png (Going to physical location)

Example JSON Output:
{
  "title": "E-Devlet Şifresi Alma Rehberi",
  "steps": [
    {
      "step_number": 1,
      "title": "PTT'ye Gidin",
      "description": "Size en yakın PTT şubesine kimliğinizle birlikte gitmeniz gerekiyor.",
      "image_url": "/static/img/ui_physical_visit.png"
    },
    {
      "step_number": 2,
      "title": "Gişeye Başvurun",
      "description": "Görevliye 'E-Devlet şifresi almak istiyorum' diyerek kimliğinizi gösterin.",
      "image_url": "/static/img/ui_selection.png"
    },
    {
      "step_number": 3,
      "title": "Şifrenizi Alın",
      "description": "Görevli size kapalı bir zarf verecektir. Bu zarfın içinde geçici şifreniz yazar.",
      "image_url": "/static/img/ui_success.png"
    }
  ],
  "help_options": ["PTT nerede bilmiyorum", "Kimliğim yanımda değil", "Sıra çok kalabalık", "Başka bir sorun"]
}

Now generate a high-quality guide for: """

        full_prompt = system_instruction + prompt
        
        response = model.generate_content(
            full_prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        # Clean up response text
        text_response = response.text.strip()
        if text_response.startswith("```json"):
            text_response = text_response[7:-3]
        elif text_response.startswith("```"):
             text_response = text_response[3:-3]
             
        data = json.loads(text_response)
        
        # Robust image URL validation
        valid_images = [
            "/static/img/ui_app_open.png", "/static/img/ui_login.png", 
            "/static/img/ui_selection.png", "/static/img/ui_security.png",
            "/static/img/ui_calendar.png", "/static/img/ui_success.png",
            "/static/img/ui_physical_visit.png"
        ]
        
        for step in data.get("steps", []):
            if step.get("image_url") not in valid_images:
                import random
                step["image_url"] = random.choice(valid_images)
                
        return data

    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return _get_mock_guide(prompt)

def _get_mock_guide(prompt: str) -> dict:
     return {
        "title": f"{prompt} Rehberi (Demo)",
        "steps": [
            {
                "step_number": 1,
                "title": "Hazırlık",
                "description": "Lütfen önce internetinizin açık olduğundan emin olun. Acele etmemize gerek yok.",
                "image_url": "/static/img/ui_app_open.png"
            },
            {
                "step_number": 2,
                "title": "Uygulamayı Açın",
                "description": f"{prompt} işlemi için ilgili resmi uygulamayı telefonunuzdan bulun ve üzerine dokunun.",
                "image_url": "/static/img/ui_app_open.png"
            },
            {
                "step_number": 3,
                "title": "Giriş Yapın",
                "description": "Eğer şifre sorarsa, bilgilerinizi sakince girin. Ekrandaki kutucuklara tıklayabilirsiniz.",
                "image_url": "/static/img/ui_login.png"
            },
            {
                "step_number": 4,
                "title": "İşlemi Bulun",
                "description": "Ana ekranda yapmak istediğiniz işlemi arayın. Genellikle büyük butonlarla gösterilir.",
                "image_url": "/static/img/ui_selection.png"
            },
             {
                "step_number": 5,
                "title": "Onaylayın",
                "description": "Bilgilerinizi kontrol edip onay tuşuna basın. Yanlış yaparsanız geri dönebilirsiniz.",
                "image_url": "/static/img/ui_success.png"
            }
        ],
        "help_options": ["Bende farklı görünüyor", "Devam edemiyorum", "Kod/SMS gelmedi", "Yanlış bir şeye bastım", "Başka bir sorun"]
    }

def get_calming_guidance(guide_title: str, step_title: str) -> str:
    """Provides calming, AI-generated guidance for a specific step"""
    # In a real app, this would call an LLM with specific context
    responses = [
        f"Lütfen derin bir nefes alın. {guide_title} işleminde '{step_title}' adımını yapmak çok kolaydır. Yanındayız, her şey yolunda.",
        f"Endişelenmeyin, '{step_title}' adımında duraklamanız çok normal. Biraz dinlenin ve tekrar deneyin, başaracaksınız.",
        f"Panik yapmanıza hiç gerek yok. {guide_title} konusunda size yardımcı olmak için buradayız. '{step_title}' adımı için sadece ekrana bir kez daha odaklanın.",
        f"Sakin olun, Yanındayım yanınızda! '{step_title}' adımı gözünüzü korkutmasın, yavaş yavaş ilerleyelim."
    ]
    import random
    return random.choice(responses)

def generate_fraud_scenario() -> dict:
    """
    Generates a random fraud simulation scenario using Gemini.
    Returns a dict with scenario, correct_action, explanation.
    """
    if not GOOGLE_API_KEY:
        return {
            "scenario": "Telefonda biri aradı, 'Ben savcıyım, adınız terör örgütüne karıştı, acil para göndermeniz lazım' dedi.",
            "correct_action": "hangup",
            "explanation": "Devlet görevlileri (savcı, polis) asla telefonda para istemez. Bu klasik bir dolandırıcılık yöntemidir."
        }

    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        
        prompt = """
        Generate a short, realistic phone or internet fraud scenario targeting elderly people in Turkey.
        Examples: Police/Prosecutor scam, Grandchild in trouble, winning a prize, bank account hacking.
        
        Output stricly JSON format:
        {
          "scenario": "The situational text (max 2 sentences, simple Turkish)",
          "correct_action": "hangup" (if it's a scam) or "believe" (if it's safe - but mostly allow scams for education),
          "explanation": "Why this is a scam (1 sentence simple Turkish)"
        }
        """
        
        response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        text_response = response.text.strip()
        
        # Clean markdown if present
        if text_response.startswith("```json"):
            text_response = text_response[7:-3]
        elif text_response.startswith("```"):
             text_response = text_response[3:-3]
             
        data = json.loads(text_response)
        return data

    except Exception as e:
        logger.error(f"Gemini Fraud Gen Error: {e}")
        return {
            "scenario": "Bankadan aradığını söyleyen biri, 'Hesabınız çalındı, şifrenizi söyleyin' diyor.",
            "correct_action": "hangup",
            "explanation": "Bankalar asla telefonda şifrenizi istemez. Bu bir dolandırıcılıktır."
        }

def get_ai_help_response(user_query: str, guide_context: str = None, failed_attempts: list[str] = None, all_steps: list[dict] = None) -> str:
    """
    Generates a strict, calming response for specific user problems using Gemini API.
    Provides context of the entire guide for better problem solving.
    """
    if not GOOGLE_API_KEY:
        return "Şu an yapay zeka servisine ulaşamıyorum. Lütfen 'Devam Edemiyorum' gibi hazır seçenekleri kullanın."

    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        
        # Format all steps for context
        steps_context = ""
        if all_steps:
            steps_context = "\nRehberdeki Tüm Adımlar:\n"
            for s in all_steps:
                steps_context += f"- Adım {s.get('step_number')}: {s.get('title')} - {s.get('description')}\n"

        system_instruction = f"""
You are a calm, patient technical support assistant for elderly users of the "Yanındayım" app.
Your ONLY job is to help them with the specific problem they describe.

Strict Rules:
1. Answer in very simple Turkish. Short sentences. No technical jargon.
2. Use the provided context (Guide Title, Current Step, and ALL other steps) to understand exactly where the user is and what might be confusing.
3. If the input is random chatter, politely refocus on helping them with the app.
4. Provide 1-2 direct, calming actions.
5. If the user's problem is that they are stuck, suggest looking at the current or next step's action.
6. Format instructions as a numbered list (1., 2.).

Context: {guide_context or "Genel Yardım"}{steps_context}
User Query: {user_query}
"""

        if failed_attempts:
            # We treat failed_attempts as conversation history
            history_text = "\n".join([f"- {attempt}" for attempt in failed_attempts])
            system_instruction += f"\n\nÖNEMLİ: Kullanıcı şu çözümleri denedi ama İŞE YARAMADI:\n{history_text}\n\nLütfen farklı ve daha basit bir çözüm sunun."

        response = model.generate_content(system_instruction)
        return response.text.strip()

        response = model.generate_content(system_instruction)
        return response.text.strip()

    except Exception as e:
        logger.error(f"Gemini API Help Error: {e}")
        return "Şu an bağlantıda bir sorun var. Lütfen biraz bekleyip tekrar deneyin."
