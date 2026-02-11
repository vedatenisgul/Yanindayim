# Yanındayım

![Yanındayım Logo](app/static/img/logo.png)

**Yanındayım** (I am by your side) is an elderly-friendly Turkish web application that helps senior citizens navigate the digital world with confidence. It provides simplified, step-by-step guides for essential tasks like e-Devlet access, medical appointments (MHRS), and everyday digital activities.

Built with accessibility and trust at its core, the app features AI-powered assistance, voice navigation, fraud awareness training, and a companion mode that notifies trusted contacts when users are struggling.

---

## Screenshots

### Home Page
The landing page showcases available guides with visual cards and a search bar for quick access.

![Home Page](docs/screenshots/home.png)

### Guide Steps
Interactive step-by-step guides with progress tracking, visual instructions, and AI-powered help when users get stuck.

![Guide Page](docs/screenshots/guide.png)

### User Profile & Companion Mode
Personal dashboard with progress stats, trusted contacts management (Refakatçi Modu), and guide history.

![Profile Page](docs/screenshots/profile.png)

### Companion Notification
When a user struggles (3+ help requests), the system offers to notify their trusted contacts.

![Companion Mode](docs/screenshots/companion.png)

---

## Features

### Core
- **Elderly-Friendly UI** — Minimalist Apple/Linear-inspired design with large typography, high contrast, and simple navigation
- **Step-by-Step Guides** — Interactive walkthroughs with progress bars, visual illustrations, and resume functionality
- **AI-Powered Help** — Google Gemini provides calming, simplified technical assistance when users get stuck
- **Voice Navigation** — Hands-free control with Turkish voice commands (İleri, Geri, Sorun Var)

### User Progress
- **Server-Side Progress Tracking** — Saves guide progress to the server for logged-in users
- **Resume from Last Step** — Users can pick up exactly where they left off
- **Profile Dashboard** — Stats on completed guides, in-progress guides, and weekly streak

### Companion Mode (Refakatçi Modu)
- **Trusted Contacts** — Users can add up to 3 trusted people (children, neighbors, friends)
- **Frustration Detection** — System detects when users are struggling (3+ problem reports)
- **Notification System** — Offers to notify trusted contacts with guide/step context

### Safety & Accessibility
- **Fraud Awareness Training** — Interactive scenarios teaching users to recognize scams
- **Reading Mode** — Simplified text display for better readability
- **PWA Support** — Installable as a mobile app with offline capabilities
- **Admin Dashboard** — Tools for managing and testing guides

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.9+) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) + [SQLAlchemy ORM](https://www.sqlalchemy.org/) |
| **Frontend** | Jinja2 Templates, Vanilla CSS, JavaScript |
| **AI** | [Google Gemini API](https://ai.google.dev/), [Hugging Face Inference](https://huggingface.co/inference-endpoints) |
| **Containerization** | [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) |

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Google Gemini API Key
- Hugging Face API Token (optional, for image generation)

### Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd Yanındayım

# 2. Configure environment variables
cp .env.example .env
# Edit .env and add your API keys

# 3. Start the application
docker compose up --build

# 4. Open in browser
open http://localhost:8000
```

---

## Project Structure

```
.
├── app/
│   ├── main.py              # Application entry point
│   ├── database.py          # SQLAlchemy connection setup
│   ├── models.py            # Database models (User, Guide, TrustedContact, etc.)
│   ├── routers/
│   │   ├── admin.py         # Admin dashboard routes
│   │   ├── auth.py          # Authentication (login, register, logout)
│   │   └── pages.py         # Public pages, APIs, companion mode
│   ├── static/
│   │   ├── css/style.css    # Complete design system
│   │   ├── js/              # Guide steps, voice nav, safety, reading mode
│   │   ├── img/             # Static images and generated icons
│   │   ├── sw.js            # Service worker for PWA
│   │   └── manifest.json    # PWA manifest
│   ├── templates/           # Jinja2 HTML templates
│   └── utils/
│       ├── ai_utils.py      # Gemini & HuggingFace integration
│       └── companion.py     # Companion mode notification formatter
├── docker-compose.yml       # Multi-container orchestration
├── Dockerfile               # Web service container
├── init.sql                 # DB schema + seed data
├── requirements.txt         # Python dependencies
└── .env.example             # Environment variable template
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_API_KEY` | Google Gemini API key |
| `HUGGINGFACE_API_KEY` | Hugging Face token (image generation) |
| `SESSION_SECRET_KEY` | Secret key for session encryption |
| `POSTGRES_USER` | Database username (Docker) |
| `POSTGRES_PASSWORD` | Database password (Docker) |

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
