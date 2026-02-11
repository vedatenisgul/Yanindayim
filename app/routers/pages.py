from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Guide, Idea, StepProblem, User, UserGuideProgress, TrustedContact, CompanionAlert
from app.utils.ai_utils import get_calming_guidance, get_ai_help_response, generate_fraud_scenario
from app.utils.companion import format_companion_message

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/offline")
async def offline_page(request: Request):
    return templates.TemplateResponse("offline.html", {"request": request})

@router.get("/")
async def home(request: Request, db: Session = Depends(get_db)):
    guides = db.query(Guide).limit(6).all()
    
    user_session = request.session.get("user")
    user_id = user_session.get("id") if user_session else None
    
    user = None
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        
    return templates.TemplateResponse("index.html", {"request": request, "guides": guides, "user": user})

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

@router.get("/profile")
async def profile_page(request: Request, db: Session = Depends(get_db)):
    user_session = request.session.get("user")
    if not user_session:
        return RedirectResponse(url="/login", status_code=303)
    
    user_id = user_session.get("id")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(url="/login", status_code=303)

    # Get all progress records for this user
    all_progress = db.query(UserGuideProgress).filter(
        UserGuideProgress.user_id == user_id
    ).all()

    completed_progress = [p for p in all_progress if p.completed]
    in_progress = [p for p in all_progress if not p.completed]

    # Get guides user hasn't started
    started_guide_ids = [p.guide_id for p in all_progress]
    available_query = db.query(Guide).filter(Guide.status == "published")
    if started_guide_ids:
        available_query = available_query.filter(~Guide.id.in_(started_guide_ids))
    available_guides = available_query.order_by(Guide.priority.desc()).all()

    # Calculate weekly streak (guides completed in the last 7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    weekly_count = sum(
        1 for p in completed_progress
        if p.completed_at and p.completed_at >= week_ago
    )

    return templates.TemplateResponse("profile.html", {
        "request": request,
        "user": user,
        "completed": completed_progress,
        "in_progress": in_progress,
        "available_guides": available_guides,
        "weekly_count": weekly_count,
        "total_completed": len(completed_progress),
    })

@router.post("/api/progress/save")
async def save_progress(request: Request, db: Session = Depends(get_db)):
    user_session = request.session.get("user")
    if not user_session:
        return {"success": False, "error": "Not logged in"}
    
    data = await request.json()
    guide_id = data.get("guide_id")
    current_step = data.get("current_step", 1)
    total_steps = data.get("total_steps", 1)

    if not guide_id:
        return {"success": False, "error": "guide_id required"}

    user_id = user_session.get("id")
    progress = db.query(UserGuideProgress).filter(
        UserGuideProgress.user_id == user_id,
        UserGuideProgress.guide_id == guide_id
    ).first()

    if progress:
        progress.current_step = current_step
        progress.total_steps = total_steps
    else:
        progress = UserGuideProgress(
            user_id=user_id,
            guide_id=guide_id,
            current_step=current_step,
            total_steps=total_steps
        )
        db.add(progress)

    db.commit()
    return {"success": True}

@router.post("/api/progress/complete")
async def complete_progress(request: Request, db: Session = Depends(get_db)):
    user_session = request.session.get("user")
    if not user_session:
        return {"success": False, "error": "Not logged in"}
    
    data = await request.json()
    guide_id = data.get("guide_id")
    if not guide_id:
        return {"success": False, "error": "guide_id required"}

    user_id = user_session.get("id")
    progress = db.query(UserGuideProgress).filter(
        UserGuideProgress.user_id == user_id,
        UserGuideProgress.guide_id == guide_id
    ).first()

    if progress:
        progress.completed = True
        progress.completed_at = datetime.now(timezone.utc)
    else:
        progress = UserGuideProgress(
            user_id=user_id,
            guide_id=guide_id,
            completed=True,
            completed_at=datetime.now(timezone.utc)
        )
        db.add(progress)

    db.commit()
    return {"success": True}

@router.get("/api/progress/{guide_id}")
async def get_progress(request: Request, guide_id: int, db: Session = Depends(get_db)):
    user_session = request.session.get("user")
    if not user_session:
        return {"success": False, "logged_in": False}
    
    user_id = user_session.get("id")
    progress = db.query(UserGuideProgress).filter(
        UserGuideProgress.user_id == user_id,
        UserGuideProgress.guide_id == guide_id
    ).first()

    if progress:
        return {
            "success": True,
            "current_step": progress.current_step,
            "total_steps": progress.total_steps,
            "completed": progress.completed
        }
    return {"success": True, "current_step": None}

@router.get("/search")
async def search_page(request: Request, db: Session = Depends(get_db)):
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

    guides = db.query(Guide).filter(
        (Guide.title.ilike(f"%{q}%")) | (Guide.content.ilike(f"%{q}%"))
    ).order_by(Guide.priority.desc(), Guide.id).limit(10).all()

    return [{"id": g.id, "title": g.title, "content": g.content, "image_url": g.image_url} for g in guides]

@router.post("/api/ideas/create")
async def create_idea(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    title = data.get("title")
    if not title:
        return {"success": False, "error": "Title required"}
    
    idea = db.query(Idea).filter(Idea.title == title).first()
    if idea:
        idea.count += 1
    else:
        idea = Idea(title=title)
        db.add(idea)
    
    db.commit()
    return {"success": True}

# ===== Companion Mode (Refakatçi Modu) =====

@router.get("/api/contacts")
async def list_contacts(request: Request, db: Session = Depends(get_db)):
    user_session = request.session.get("user")
    if not user_session:
        return {"success": False, "error": "Not logged in"}

    contacts = db.query(TrustedContact).filter(
        TrustedContact.user_id == user_session["id"],
        TrustedContact.is_active == True
    ).order_by(TrustedContact.created_at).all()

    return {
        "success": True,
        "contacts": [
            {
                "id": c.id,
                "name": c.name,
                "phone": c.phone,
                "relationship_label": c.relationship_label
            } for c in contacts
        ]
    }

@router.post("/api/contacts")
async def add_contact(request: Request, db: Session = Depends(get_db)):
    user_session = request.session.get("user")
    if not user_session:
        return {"success": False, "error": "Not logged in"}

    data = await request.json()
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    relationship_label = data.get("relationship_label", "Yakın").strip()

    if not name or not phone:
        return {"success": False, "error": "İsim ve telefon zorunludur"}

    # Max 3 contacts
    existing_count = db.query(TrustedContact).filter(
        TrustedContact.user_id == user_session["id"],
        TrustedContact.is_active == True
    ).count()

    if existing_count >= 3:
        return {"success": False, "error": "En fazla 3 güvenilir kişi ekleyebilirsiniz"}

    contact = TrustedContact(
        user_id=user_session["id"],
        name=name,
        phone=phone,
        relationship_label=relationship_label
    )
    db.add(contact)
    db.commit()

    return {
        "success": True,
        "contact": {
            "id": contact.id,
            "name": contact.name,
            "phone": contact.phone,
            "relationship_label": contact.relationship_label
        }
    }

@router.delete("/api/contacts/{contact_id}")
async def delete_contact(request: Request, contact_id: int, db: Session = Depends(get_db)):
    user_session = request.session.get("user")
    if not user_session:
        return {"success": False, "error": "Not logged in"}

    contact = db.query(TrustedContact).filter(
        TrustedContact.id == contact_id,
        TrustedContact.user_id == user_session["id"]
    ).first()

    if not contact:
        return {"success": False, "error": "Kişi bulunamadı"}

    contact.is_active = False
    db.commit()
    return {"success": True}

@router.post("/api/companion/notify")
async def companion_notify(request: Request, db: Session = Depends(get_db)):
    user_session = request.session.get("user")
    if not user_session:
        return {"success": False, "error": "Not logged in"}

    data = await request.json()
    guide_id = data.get("guide_id")
    step_number = data.get("step_number", 1)
    frustration_count = data.get("frustration_count", 3)

    user_id = user_session["id"]
    user_name = user_session.get("name", "Kullanıcı")

    # Get guide title
    guide_title = "Bilinmeyen Rehber"
    if guide_id:
        guide = db.query(Guide).filter(Guide.id == guide_id).first()
        if guide:
            guide_title = guide.title

    # Get active contacts
    contacts = db.query(TrustedContact).filter(
        TrustedContact.user_id == user_id,
        TrustedContact.is_active == True
    ).all()

    if not contacts:
        return {"success": False, "error": "Güvenilir kişi eklenmemiş"}

    # Create alerts for all active contacts
    notified_names = []
    for contact in contacts:
        message = format_companion_message(user_name, guide_title, step_number, frustration_count)
        alert = CompanionAlert(
            user_id=user_id,
            contact_id=contact.id,
            guide_id=guide_id,
            step_number=step_number,
            frustration_count=frustration_count,
            message=message
        )
        db.add(alert)
        notified_names.append(contact.name)

    db.commit()

    return {
        "success": True,
        "notified": notified_names,
        "message": f"{', '.join(notified_names)} bilgilendirildi"
    }

@router.post("/api/guides/report-problem")
async def report_problem(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    guide_id = data.get("guide_id")
    step_number = data.get("step_number")
    problem_type = data.get("problem_type", "general") 
    custom_text = data.get("custom_text")
    history = data.get("history", []) 
    
    if guide_id and step_number:
        problem = StepProblem(guide_id=guide_id, step_number=step_number)
        db.add(problem)
        db.commit()

    guide = None
    step_title = "Genel Yardım"
    step_description = ""
    all_steps_data = []
    
    if guide_id:
        guide = db.query(Guide).filter(Guide.id == guide_id).first()
        if guide:
            all_steps_data = [{"step_number": s.step_number, "title": s.title, "description": s.description} for s in guide.steps]
            
            if step_number:
                for s in guide.steps:
                    if s.step_number == step_number:
                        step_title = s.title
                        step_description = s.description
                        break
    
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

    if history:
         user_query = custom_text if custom_text else f"Sorunum şuydu: {static_responses.get(problem_type, problem_type)}"
         guidance = get_ai_help_response(user_query, context_msg, failed_attempts=history, all_steps=all_steps_data)
    
    elif problem_type in static_responses:
        guidance = static_responses[problem_type]
    elif problem_type == "other" and custom_text:
        guidance = get_ai_help_response(custom_text, context_msg, all_steps=all_steps_data)
    else:
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

    guides = db.query(Guide).filter(
        Guide.status == "published",
        (Guide.title.ilike(f"%{query}%")) | (Guide.content.ilike(f"%{query}%"))
    ).limit(3).all()

    results = [{"id": g.id, "title": g.title, "type": "guide"} for g in guides]
    
@router.get("/api/safety/scenario")
async def safety_scenario(db: Session = Depends(get_db)):
    # Try to get a random scenario from DB
    import random
    from app.models import FraudScenario
    
    count = db.query(FraudScenario).count()
    if count > 0:
        random_offset = random.randint(0, count - 1)
        scenario = db.query(FraudScenario).offset(random_offset).first()
        return {
            "scenario": scenario.scenario,
            "correct_action": scenario.correct_action,
            "explanation": scenario.explanation
        }
    
    # Fallback to AI if DB is empty
    scenario_data = generate_fraud_scenario()
    return scenario_data
