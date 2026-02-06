# Yanındayım 🤝

**Yanındayım** (I am by your side) is a modern, elderly-friendly Turkish web application designed to help senior citizens navigate the digital world with confidence. It provides simplified, step-by-step guides for essential tasks like e-Devlet access, medical appointments (MHRS), and everyday digital activities.

![Yanındayım Hero](/app/static/img/logo.png)

## ✨ Features

- **Elderly-Friendly UI**: Minimalist design with high contrast, large typography, and simple navigation (inspired by Linear and Apple).
- **AI-Powered Guides**: Dynamically generates step-by-step instructions in simple Turkish using Google Gemini.
- **Visual Illustrations**: Automated icon and image generation via Hugging Face to make steps easier to follow.
- **Calming Assistance**: Integrated AI support to provide reassuring and simplified technical help when users get stuck.
- **Admin Dashboard**: Tools for administrators to manage, test, and refine guides.
- **Secure Authentication**: Simple registration and login system.

## 🛠 Tech Stack

- **Backend**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.9+)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [SQLAlchemy ORM](https://www.sqlalchemy.org/)
- **Frontend**: Jinja2 Templates, Vanilla CSS, Responsive Layout
- **AI Integrations**: 
    - [Google Gemini API](https://ai.google.dev/) (Content Generation)
    - [Hugging Face Inference](https://huggingface.co/inference-endpoints) (Image Generation)
- **Containerization**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- Google Gemini API Key
- Hugging Face API Token (optional, for image generation)

### Setup with Docker (Recommended)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Yanındayım
   ```

2. **Configure Environment Variables**:
   Copy the example environment file and fill in your keys:
   ```bash
   cp .env.example .env
   # Edit .env and add your GOOGLE_API_KEY, etc.
   ```

3. **Start the application**:
   ```bash
   docker-compose up --build
   ```

4. **Access the app**:
   Open [http://localhost:8000](http://localhost:8000) in your browser.


## 📂 Project Structure

```bash
.
├── app/
│   ├── main.py          # Application entry point
│   ├── database.py      # SQLAlchemy connection setup
│   ├── models.py        # Database models
│   ├── routers/         # API & Page routes (admin, auth, pages)
│   ├── static/          # CSS, JS, and generated images
│   ├── templates/       # Jinja2 HTML templates
│   └── utils/           # AI helpers and utility functions
├── docker-compose.yml   # Multi-container orchestration
├── Dockerfile           # Web service container definition
├── init.sql             # DB schema and initial seed data
└── .env.example         # Environment variable template
```

## 🔑 Environment Variables

The following variables are required in your `.env` file:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_API_KEY` | Your Google Gemini API Key |
| `HUGGINGFACE_API_KEY` | Hugging Face Token for image generation |
| `SESSION_SECRET_KEY` | Secret key for session encryption |
| `POSTGRES_USER` | DB User (if using Docker) |
| `POSTGRES_PASSWORD` | DB Password (if using Docker) |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
