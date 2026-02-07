import bcrypt
from fastapi import APIRouter, Request, Form, Depends
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

@router.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@router.post("/login")
async def login(request: Request, email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    
    if not user or not verify_password(password, user.hashed_password):
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error": "Geçersiz e-posta veya şifre"
        })
    
    request.session["user"] = {
        "name": user.name, 
        "email": user.email, 
        "id": user.id, 
        "role": user.role
    }
    response = RedirectResponse(url="/", status_code=303)
    return response

@router.get("/register")
async def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@router.post("/register")
async def register(request: Request, name: str = Form(...), email: str = Form(...), password: str = Form(...), confirm_password: str = Form(...), db: Session = Depends(get_db)):
    if password != confirm_password:
         return templates.TemplateResponse("register.html", {
            "request": request,
            "error": "Şifreler eşleşmiyor"
        })

    user = db.query(User).filter(User.email == email).first()
    if user:
        return templates.TemplateResponse("register.html", {
            "request": request,
            "error": "Bu e-posta adresi zaten kayıtlı"
        })
    
    hashed_password = get_password_hash(password)
    new_user = User(email=email, name=name, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    request.session["user"] = {
        "name": new_user.name, 
        "email": new_user.email, 
        "id": new_user.id, 
        "role": new_user.role
    }
    return RedirectResponse(url="/", status_code=303)

@router.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/", status_code=303)
