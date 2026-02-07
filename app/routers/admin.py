from fastapi import APIRouter, Request, Form, Depends, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Guide, User, Idea, GuideStep, StepProblem

router = APIRouter(prefix="/admin", tags=["admin"])
templates = Jinja2Templates(directory="app/templates")

# Admin-only dependency
def get_admin_user(request: Request):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

from app.utils.ai_utils import generate_guide_with_ai

@router.get("")
async def admin_dashboard(request: Request, db: Session = Depends(get_db)):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        return RedirectResponse(url="/login", status_code=303)
    
    # Sort guides by id desc to show newest first
    guides = db.query(Guide).order_by(Guide.id.desc()).all()
    ideas = db.query(Idea).order_by(Idea.count.desc()).all()
    step_problems = db.query(StepProblem).order_by(StepProblem.id.desc()).all()
    
    return templates.TemplateResponse("admin_dashboard.html", {
        "request": request,
        "user": user,
        "guides": guides,
        "ideas": ideas,
        "step_problems": step_problems
    })

@router.post("/generate")
async def generate_guide(request: Request, prompt: str = Form(...), db: Session = Depends(get_db)):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    import json
    generated = generate_guide_with_ai(prompt)
    return {
        "success": True,
        "title": generated["title"],
        "steps": generated["steps"],
        "help_options": generated.get("help_options", []),
        "steps_json": json.dumps(generated["steps"]),
        "help_options_json": json.dumps(generated.get("help_options", [])),
        "prompt": prompt
    }

@router.post("/guides/create")
async def create_guide(
    request: Request,
    title: str = Form(...),
    content: str = Form(""),
    status: str = Form("published"),
    image_url: str = Form(None),
    priority: int = Form(0),
    step_titles: list[str] = Form(None),
    step_descriptions: list[str] = Form(None),
    step_images: list[str] = Form(None),
    step_numbers: list[int] = Form(None),
    help_options: str = Form(None), # JSON string
    generate_ai_images: str = Form(None),
    db: Session = Depends(get_db)
):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    guide = Guide(title=title, content=content, status=status, image_url=image_url, priority=priority, help_options=help_options)
    db.add(guide)
    db.commit()
    db.refresh(guide)

    # Handle steps
    if step_titles:
        for i in range(len(step_titles)):
            img_url = step_images[i] if step_images and step_images[i] else None
            
            # Automate image generation if missing AND toggle is ON
            if not img_url and generate_ai_images == "true":
                from app.utils.ai_utils import generate_step_image
                generated_url = generate_step_image(title, step_titles[i], step_descriptions[i] if step_descriptions else "")
                if generated_url:
                    img_url = generated_url

            step = GuideStep(
                guide_id=guide.id,
                step_number=step_numbers[i] if step_numbers else i + 1,
                title=step_titles[i],
                description=step_descriptions[i] if step_descriptions else "",
                image_url=img_url
            )
            db.add(step)
        db.commit()
    
    return RedirectResponse(url="/admin", status_code=303)

@router.post("/guides/create_structured")
async def create_structured_guide(
    request: Request,
    title: str = Form(...),
    steps_json: str = Form(...),
    help_options_json: str = Form(None),
    status: str = Form("published"),
    generate_ai_images: str = Form(None),
    db: Session = Depends(get_db)
):
    import json
    from app.utils.ai_utils import generate_step_image
    
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Create the guide
    guide = Guide(title=title, content="", status=status, help_options=help_options_json)
    db.add(guide)
    
    # Create the steps
    try:
        steps = json.loads(steps_json)
        
        for s in steps:
            # Automate image generation if image_url is missing or a generic placeholder
            img_url = s.get("image_url")
            print(f"DEBUG ADMIN: Processing step '{s['title']}', current img: {img_url}")
            # Automate image generation if image_url is missing or a generic placeholder AND toggle is ON
            if (not img_url or "static/img/ui_" in img_url) and generate_ai_images == "true":
                print(f"DEBUG ADMIN: Triggering image generation for '{s['title']}'...")
                generated_url = generate_step_image(title, s["title"], s["description"])
                if generated_url:
                    print(f"DEBUG ADMIN: Generation SUCCESS: {generated_url}")
                    img_url = generated_url
                else:
                    print(f"DEBUG ADMIN: Generation FAILED for '{s['title']}', keeping placeholder.")

            step = GuideStep(
                step_number=s["step_number"],
                title=s["title"],
                description=s["description"],
                image_url=img_url
            )
            guide.steps.append(step)
        
        db.commit()
    except Exception as e:
        import logging
        logging.error(f"Structured Creation Failed: {e}")
        db.rollback()
    
    return RedirectResponse(url="/admin", status_code=303)

@router.get("/guides/new")
async def new_guide_form(request: Request):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        return RedirectResponse(url="/login", status_code=303)
    
    return templates.TemplateResponse("admin_guide_form.html", {
        "request": request,
        "user": user,
        "guide": None,
        "is_edit": False
    })

@router.get("/guides/{guide_id}/edit")
async def edit_guide_form(request: Request, guide_id: int, db: Session = Depends(get_db)):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        return RedirectResponse(url="/login", status_code=303)
    
    guide = db.query(Guide).filter(Guide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    
    return templates.TemplateResponse("admin_guide_form.html", {
        "request": request,
        "user": user,
        "guide": guide,
        "is_edit": True
    })

@router.post("/guides/{guide_id}")
async def update_guide(
    request: Request,
    guide_id: int,
    title: str = Form(...),
    content: str = Form(""),
    status: str = Form("published"),
    image_url: str = Form(None),
    priority: int = Form(0),
    help_options: str = Form(None),
    step_titles: list[str] = Form(None),
    step_descriptions: list[str] = Form(None),
    step_images: list[str] = Form(None),
    step_numbers: list[int] = Form(None),
    generate_ai_images: str = Form(None),
    db: Session = Depends(get_db)
):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    guide = db.query(Guide).filter(Guide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")

    guide.title = title
    guide.content = content
    guide.status = status
    guide.image_url = image_url
    guide.priority = priority
    guide.help_options = help_options

    # Update steps - ONLY if new steps are provided
    if step_titles:
        db.query(GuideStep).filter(GuideStep.guide_id == guide_id).delete()
        
        for i in range(len(step_titles)):
            img_url = step_images[i] if step_images and step_images[i] else None
            
            # Automate image generation if toggle is ON
            if not img_url and generate_ai_images == "true":
                from app.utils.ai_utils import generate_step_image
                generated_url = generate_step_image(title, step_titles[i], step_descriptions[i] if step_descriptions else "")
                if generated_url:
                    img_url = generated_url

            step = GuideStep(
                guide_id=guide.id,
                step_number=step_numbers[i] if step_numbers else i + 1,
                title=step_titles[i],
                description=step_descriptions[i] if step_descriptions else "",
                image_url=img_url
            )
            db.add(step)
    else:
        print("DEBUG: No new steps provided, preserving existing steps.")
    
    db.commit()
    return RedirectResponse(url="/admin", status_code=303)

@router.post("/guides/{guide_id}/delete")
async def delete_guide(request: Request, guide_id: int, db: Session = Depends(get_db)):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    guide = db.query(Guide).filter(Guide.id == guide_id).first()
    if guide:
        db.delete(guide)
        db.commit()
    
    return {"success": True}

@router.post("/ideas/{idea_id}/delete")
async def delete_idea(idea_id: int, request: Request, db: Session = Depends(get_db)):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        return RedirectResponse(url="/login", status_code=303)
    
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if idea:
        db.delete(idea)
        db.commit()
    
    return {"success": True}

@router.get("/guides/{guide_id}/test")
async def test_guide(request: Request, guide_id: int, db: Session = Depends(get_db)):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        return RedirectResponse(url="/login", status_code=303)
    
    guide = db.query(Guide).filter(Guide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    
    return templates.TemplateResponse("admin_guide_test.html", {
        "request": request,
        "user": user,
        "guide": guide
    })

@router.post("/problems/{problem_id}/delete")
async def delete_problem(problem_id: int, request: Request, db: Session = Depends(get_db)):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        return RedirectResponse(url="/login", status_code=303)
    
    problem = db.query(StepProblem).filter(StepProblem.id == problem_id).first()
    if problem:
        db.delete(problem)
        db.commit()
    
    return {"success": True}

@router.post("/problems/clear")
async def clear_problems(request: Request, db: Session = Depends(get_db)):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        return RedirectResponse(url="/login", status_code=303)
    
    db.query(StepProblem).delete()
    db.commit()
    
    return {"success": True}

# --- Fraud Scenario Management ---

from app.models import FraudScenario

@router.get("/scenarios")
async def admin_scenarios(request: Request, db: Session = Depends(get_db)):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        return RedirectResponse(url="/login", status_code=303)
    
    scenarios = db.query(FraudScenario).order_by(FraudScenario.id.desc()).all()
    
    return templates.TemplateResponse("admin_scenarios.html", {
        "request": request,
        "user": user,
        "scenarios": scenarios
    })

@router.post("/scenarios/create")
async def create_scenario(
    request: Request,
    scenario: str = Form(...),
    correct_action: str = Form(...),
    explanation: str = Form(...),
    difficulty: int = Form(1),
    db: Session = Depends(get_db)
):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    new_scenario = FraudScenario(
        scenario=scenario,
        correct_action=correct_action,
        explanation=explanation,
        difficulty=difficulty
    )
    db.add(new_scenario)
    db.commit()
    
    return RedirectResponse(url="/admin/scenarios", status_code=303)

@router.post("/scenarios/{scenario_id}/delete")
async def delete_scenario(scenario_id: int, request: Request, db: Session = Depends(get_db)):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    scenario = db.query(FraudScenario).filter(FraudScenario.id == scenario_id).first()
    if scenario:
        db.delete(scenario)
        db.commit()
    
    return {"success": True}
