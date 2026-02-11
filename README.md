# Momentum - Personal Progress Tracker

A personal productivity tool for tracking progress toward long-term goals through incremental check-ins. Built with React, TypeScript, FastAPI, and Firebase/Firestore.

## Overview

Momentum helps you:
- Track progress on long-term goals (epics)
- Log check-ins with flexible intervals
- Visualize momentum with commit-style graphs
- Get suggestions for neglected or high-momentum activities
- Store data securely in Firebase Firestore

**Key Philosophy**: Focus on "days invested" over hours tracked. Reduce friction, make progress visible, enable informed decisions about prioritization.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Python 3.11 + FastAPI + Firebase Admin SDK
- **Database**: Google Cloud Firestore (NoSQL)
- **Authentication**: Firebase Authentication (Google OAuth)
- **Deployment**: Docker + Google Cloud Run

## Project Structure

```
Progress-Tracker/
├── frontend/              # React + TypeScript app
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── services/     # Data service layer (FirestoreService, LocalStorageService)
│   │   ├── hooks/        # React hooks
│   │   └── lib/          # Utilities and types
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── backend_v2/            # FastAPI + Firestore backend
│   ├── models/           # Pydantic data models
│   ├── services/         # Firebase & Firestore services
│   ├── middleware/       # Auth middleware
│   ├── main.py           # API endpoints
│   ├── Dockerfile
│   ├── README.md         # Backend-specific docs
│   ├── DEPLOYMENT.md     # Deployment guide
│   └── ENVIRONMENTS.md   # Multi-environment setup
├── shared/                # Shared TypeScript types
│   └── types/
├── docker-compose.yml     # Local development orchestration
└── README.md              # This file
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker (optional, for containerized development)
- Firebase project (see setup below)

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new Firebase project
3. Enable **Firestore Database**:
   - Go to Firestore Database → Create database
   - Start in production mode
   - Choose a location close to your users
4. Enable **Authentication**:
   - Go to Authentication → Get Started
   - Enable "Google" sign-in provider
5. Get your Firebase config:
   - Go to Project Settings → General
   - Under "Your apps", add a web app
   - Copy the Firebase config values

### 2. Backend Setup

```bash
cd backend_v2

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Firebase credentials

# Run server
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`

**See [backend_v2/README.md](backend_v2/README.md) for detailed setup instructions.**

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your Firebase config and API URL

# Run development server
npm run dev
```

Frontend runs at `http://localhost:5173`

### 4. Using Docker (Recommended)

```bash
# Start both frontend and backend
docker-compose up

# Frontend: http://localhost:5173
# Backend: http://localhost:8000
```

## Core Concepts

### Epics
Large, overarching goals (e.g., "Launch lighting business", "Complete 2 endurance races in 2025")

### Directives
Recurring activities within an epic that drive progress (e.g., "Market research", "Structured training")

### Logs
Individual check-in entries. The primary metric is **days invested** (how many days you touched something), not hours or tasks completed.

### Activity Types
- `build` - Active creation, making something
- `learn` - Absorbing new information
- `train` - Physical practice and conditioning
- `research` - Exploration and discovery
- `plan` - Strategy and decision-making
- `arrange` - Logistics and setup

### Phases
- `exploring` - Early stage, figuring out direction
- `building` - Actively working on it
- `active` - Ongoing/maintenance mode
- `refining` - Polishing, nearly complete
- `paused` - Intentionally deprioritized

## Development

### Running in Demo Mode

The frontend works without backend using localStorage:

```bash
cd frontend
npm run dev
```

Demo mode uses `LocalStorageService` and includes sample data.

### Running with Backend

1. Start backend: `cd backend_v2 && uvicorn main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Sign in with Google
4. Data syncs to Firestore

### Environment Variables

**Frontend** (`.env`):
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_API_URL=http://localhost:8000
```

**Backend** (`.env`):
```bash
ENVIRONMENT=development
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=/path/to/serviceAccountKey.json
ALLOWED_ORIGINS=http://localhost:5173
DEBUG=true
```

## Deployment

### Deploy to Google Cloud Run

The recommended deployment platform for this stack.

**Backend:**
```bash
cd backend_v2
gcloud run deploy momentum-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**Frontend:**
```bash
cd frontend
npm run build
# Deploy dist/ to Firebase Hosting, Vercel, or Netlify
```

**See [backend_v2/DEPLOYMENT.md](backend_v2/DEPLOYMENT.md) for comprehensive deployment instructions.**

### Multi-Environment Setup

Support for UAT and Production environments with separate Firebase projects.

**See [backend_v2/ENVIRONMENTS.md](backend_v2/ENVIRONMENTS.md) for details.**

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key Endpoints

**Authentication**
- `GET /health` - Health check
- User authentication handled via Firebase Auth

**Epics**
- `GET /api/epics` - List all epics
- `POST /api/epics` - Create epic
- `PUT /api/epics/{id}` - Update epic
- `DELETE /api/epics/{id}` - Delete epic

**Directives**
- `GET /api/epics/{epic_id}/directives` - List directives
- `POST /api/epics/{epic_id}/directives` - Create directive
- `PUT /api/epics/{epic_id}/directives/{id}` - Update directive
- `DELETE /api/epics/{epic_id}/directives/{id}` - Delete directive

**Check-ins (Logs)**
- `GET /api/logs` - List check-ins
- `POST /api/logs` - Create check-in
- `DELETE /api/logs/{id}` - Delete check-in

**Data**
- `GET /api/data` - Get all user data (aggregated from Firestore)

All endpoints require Firebase ID token in `Authorization: Bearer <token>` header.

## Docker

### Building Images

```bash
# Backend
cd backend_v2
docker build -t momentum-api .

# Frontend
cd frontend
docker build -t momentum-frontend .
```

### Running with Docker Compose

```bash
# Start services
docker-compose up

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build
```

## Security & Privacy

- **Firebase Authentication**: Secure Google OAuth sign-in
- **Firestore Security Rules**: User data isolated by Firebase UID
- **HTTPS Required**: Production deployments use HTTPS
- **CORS Protection**: Configurable allowed origins
- **No Shared Data**: Each user's data is completely isolated

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /epics/{epicId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        match /directives/{directiveId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }

      match /checkins/{checkinId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Troubleshooting

### Frontend Issues

**"Firebase not initialized"**
- Check `VITE_FIREBASE_*` environment variables in `.env`
- Ensure Firebase config is correct

**Can't connect to backend**
- Verify backend is running at `VITE_API_URL`
- Check CORS settings in backend `.env`

### Backend Issues

**"Firebase credentials not found"**
- Check `FIREBASE_CREDENTIALS_PATH` points to valid service account JSON
- Verify file permissions

**"Permission denied" on Firestore**
- Check Firestore security rules
- Ensure Firebase ID token is valid

## License

MIT License - See LICENSE file for details

## Acknowledgments

Inspired by:
- Jira/scrum workflows (adapted for solo use)
- Atomic Habits (behavioral science)
- Tim Urban's work on procrastination
- GitHub commit graphs

---

**Status**: Production Ready

*Built for personal productivity*
