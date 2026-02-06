from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from app.routers import pages, auth, admin
from app.database import engine, Base
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Create tables (SQLAlchemy will skip if tables exist from init.sql)
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Add Session Middleware
# SECRET_KEY should be in env vars in production
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET_KEY"))

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Include Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(pages.router)
