from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Guide, Idea, StepProblem
from app.utils.ai_utils import get_calming_guidance, get_ai_help_response

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/offline")
async def offline_page(request: Request):
    return templates.TemplateResponse("offline.html", {"request": request})

@router.get("/")
async def read_root(request: Request, db: Session = Depends(get_db)):
    # Get published guides for homepage
    guides = db.query(Guide).filter(Guide.status == "published").order_by(Guide.priority.desc(), Guide.id).limit(6).all()
    return templates.TemplateResponse("index.html", {
        "request": request, 
        "user": request.session.get("user"),
        "guides": guides
    })

@router.get("/guide/{guide_id}")
async def guide_page(request: Request, guide_id: int, db: Session = Depends(get_db)):
    guide = db.query(Guide).filter(Guide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    
    return templates.TemplateResponse("guide.html", {
        "request": request, 
        "guide": guide,
        "steps": guide.steps,
        "title": guide.title,
        "user": request.session.get("user")
    })

@router.get("/search")
async def search_page(request: Request, db: Session = Depends(get_db)):
    # Get published guides for search suggestions
    guides = db.query(Guide).filter(Guide.status == "published").order_by(Guide.priority.desc(), Guide.id).limit(5).all()
    return templates.TemplateResponse("search.html", {
        "request": request, 
        "user": request.session.get("user"),
        "guides": guides
    })


@router.get("/api/search")
async def search_api(q: str, db: Session = Depends(get_db)):
    if not q:
        return []

    # Search in title and content using ilike for case-insensitive matching
    guides = db.query(Guide).filter(
        Guide.status == "published",
        (Guide.title.ilike(f"%{q}%")) | (Guide.content.ilike(f"%{q}%"))
    ).order_by(Guide.priority.desc(), Guide.id).limit(10).all()

    return [{"id": g.id, "title": g.title, "content": g.content} for g in guides]

@router.post("/api/ideas/create")
async def create_idea(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    title = data.get("title")
    if not title:
        return {"success": False, "error": "Title required"}
    
    # Check if idea already exists
    idea = db.query(Idea).filter(Idea.title == title).first()
    if idea:
        idea.count += 1
    else:
        idea = Idea(title=title)
        db.add(idea)
    
    db.commit()
    return {"success": True}

@router.post("/api/guides/report-problem")
async def report_problem(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    guide_id = data.get("guide_id")
    step_number = data.get("step_number")
    problem_type = data.get("problem_type", "general") # ui_diff, stuck, no_sms, mistake, other
    custom_text = data.get("custom_text")
    history = data.get("history", []) # List[str] of previous failed advice
    
    # Guide ID/Step are optional now (for Global Help)
    # ... (rest of logging logic same)

    # Log the problem ONLY if we are in a guide
    if guide_id and step_number:
        problem = StepProblem(guide_id=guide_id, step_number=step_number)
        db.add(problem)
        db.commit()

    # Get guide/step info for AI context if available
    guide = None
    step_title = "Genel Yardım"
    step_description = ""
    all_steps_data = []
    
    if guide_id:
        guide = db.query(Guide).filter(Guide.id == guide_id).first()
        if guide:
            # Convert steps to dictionary for AI context
            all_steps_data = [{"step_number": s.step_number, "title": s.title, "description": s.description} for s in guide.steps]
            
            if step_number:
                for s in guide.steps:
                    if s.step_number == step_number:
                        step_title = s.title
                        step_description = s.description
                        break
    
    # Define context message for AI
    context_msg = f"Rehber: {guide.title if guide else 'Genel Yardım'}, Şu anki Adım: {step_title}. Adım Detayı: {step_description}"

    static_responses = {
        "ui_diff": "Endişelenmeyin, bazen uygulamalar güncellenir ve renkler değişebilir. Önemli olan yazan yazılar ve butonların yeridir. Adı aynı olan butona basmanız yeterlidir.",
        "stuck": "Bazen işlemler takılabilir veya internet yavaşlayabilir. Lütfen 1-2 dakika bekleyin. Eğer hala ilerlemiyorsa, sol üstteki 'Geri' okuna basıp tekrar girmeyi deneyin.",
        "no_sms": "Kodun gelmesi 1-2 dakika sürebilir. Telefonunuzun çekip çekmediğine bakın. Eğer gelmezse ekrandaki 'Tekrar Gönder' yazısına basabilirsiniz.",
        "mistake": "Hiç sorun değil! Teknoloji deneme-yanılma ile öğrenilir. Telefonunuzun alt kısmındaki veya sol üstteki 'Geri' tuşuna basarak bir önceki ekrana dönebilirsiniz.",
        "error": "Hata mesajları bazen korkutucu olabilir ama endişelenmeyin. Genellikle 'Tamam' veya 'Kapat' tuşuna basıp tekrar denemek sorunu çözer. Eğer devam ederse, uygulamayı tamamen kapatıp yeniden açmayı deneyebilirsiniz.",
        "wrong_press": "Hiç sorun değil! Telefonunuzun 'Geri' tuşuna basarak bir önceki ekrana dönebilirsiniz.",
        "not_understand": "Haklısınız, bazen bu adımlar karmaşık gelebilir. Lütfen derin bir nefes alın. Şimdi ekrandaki adımı en basit haliyle tekrar açıklayacağım."
    }

    # If user has history (tried things that didn't work), FORCE AI RETRY
    if history:
         # Treat static problem types as text query for context if no custom text
         user_query = custom_text if custom_text else f"Sorunum şuydu: {static_responses.get(problem_type, problem_type)}"
         guidance = get_ai_help_response(user_query, context_msg, failed_attempts=history, all_steps=all_steps_data)
    
    elif problem_type in static_responses:
        guidance = static_responses[problem_type]
    elif problem_type == "other" and custom_text:
        # Strict AI Response
        guidance = get_ai_help_response(custom_text, context_msg, all_steps=all_steps_data)
    else:
        # Fallback
        guidance = get_ai_help_response(f"Sorun tipi: {problem_type}", context_msg, all_steps=all_steps_data)
    
    return {
        "success": True, 
        "guidance": guidance
    }

@router.post("/api/help/intent")
async def search_intent(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    query = data.get("query", "").lower()
    
    if not query:
        return {"results": []}

    # Simple keyword matching for intent (could be vector search in future)
    # Search guides
    guides = db.query(Guide).filter(
        Guide.status == "published",
        (Guide.title.ilike(f"%{query}%")) | (Guide.content.ilike(f"%{query}%"))
    ).limit(3).all()

    results = [{"id": g.id, "title": g.title, "type": "guide"} for g in guides]
    
    return {"results": results}
