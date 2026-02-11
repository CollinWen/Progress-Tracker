# Quick Start Guide

Get Momentum running locally in 5 minutes.

## Option 1: Demo Mode (No Backend)

The fastest way to try Momentum:

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` - Demo mode uses localStorage with sample data.

## Option 2: Full Stack with Docker

Requires Docker Desktop running:

```bash
# 1. Configure backend
cd backend_v2
cp .env.example .env
# Edit .env with your Firebase credentials

# 2. Start both services
cd ..
docker-compose up

# Frontend: http://localhost:5173
# Backend: http://localhost:8000
```

## Option 3: Full Stack (Manual)

### Terminal 1 - Backend

```bash
cd backend_v2

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install deps
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env with Firebase credentials

# Run
uvicorn main:app --reload --port 8000
```

### Terminal 2 - Frontend

```bash
cd frontend

# Install deps
npm install

# Configure
cp .env.example .env
# Edit .env with Firebase config

# Run
npm run dev
```

Visit `http://localhost:5173`

## Firebase Setup (Required for Options 2 & 3)

1. Go to https://console.firebase.google.com/
2. Create a new project
3. Enable **Firestore Database** (production mode)
4. Enable **Authentication** → Google provider
5. Get your config:
   - Project Settings → General → Your apps → Add web app
   - Copy the config values
6. Get service account:
   - Project Settings → Service Accounts
   - Generate new private key
   - Save as `serviceAccountKey.json`

### Backend .env

```bash
ENVIRONMENT=development
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=/path/to/serviceAccountKey.json
ALLOWED_ORIGINS=http://localhost:5173
DEBUG=true
```

### Frontend .env

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_API_URL=http://localhost:8000
```

## Verification

Backend health check:
```bash
curl http://localhost:8000/health
```

Should return: `{"status":"healthy","environment":"development"}`

## Troubleshooting

**"Firebase not initialized"**
- Check environment variables in .env files
- Verify Firebase project exists

**"Cannot connect to backend"**
- Ensure backend is running on port 8000
- Check CORS settings in backend .env

**"Permission denied"**
- Verify Firebase credentials path is correct
- Check service account has Firestore permissions

## Next Steps

- Read [README.md](README.md) for full documentation
- See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) before deploying
- Check [backend_v2/DEPLOYMENT.md](backend_v2/DEPLOYMENT.md) for Cloud Run deployment

---

Happy tracking! 📈
