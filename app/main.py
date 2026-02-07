from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from app.routers import pages, auth, admin
from app.database import engine, Base
import os
from dotenv import load_dotenv

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI()

secret_key = os.getenv("SESSION_SECRET_KEY", "dev_secret_key_12345")
app.add_middleware(
    SessionMiddleware, 
    secret_key=secret_key,
    session_cookie="yanindayim_session",
    max_age=3600 * 24 * 7, 
    same_site="lax",
    https_only=False 
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(pages.router)
