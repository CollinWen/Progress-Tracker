# Momentum - Personal Progress Tracker

A personal productivity tool for tracking progress toward long-term goals through incremental daily/weekly check-ins. Built with React, FastAPI, and Google Drive storage.

## 🎯 Overview

Momentum helps you:
- Track progress on long-term goals (epics)
- Log daily/weekly check-ins (logs)
- Visualize momentum with commit-style graphs
- Get suggestions for neglected or high-momentum activities
- Store all data securely in your Google Drive

**Key Philosophy**: Focus on "days invested" over hours tracked. Reduce friction, make progress visible, enable informed decisions about prioritization.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Python 3.10+ + FastAPI
- **Authentication**: Google OAuth 2.0 + JWT
- **Storage**: Google Drive API (user's Drive)
- **Styling**: Custom CSS (wellness aesthetic)

### Project Structure
```
Progress-Tracker/
├── frontend/          # React app
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── services/       # Data service layer
│   │   ├── hooks/          # React hooks
│   │   └── lib/            # Utilities
│   └── package.json
├── backend/           # FastAPI server
│   ├── models/             # Pydantic models
│   ├── services/           # Business logic
│   ├── middleware/         # Auth middleware
│   └── main.py            # API endpoints
├── shared/            # TypeScript types
│   └── types/
└── design_prompts/    # Original design docs
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Google Cloud Platform account

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5173/auth/callback`
6. Copy Client ID and Client Secret

See [backend/SETUP.md](backend/SETUP.md) for detailed instructions.

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Google OAuth credentials
# Generate JWT_SECRET with: openssl rand -hex 32

# Run server
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your VITE_GOOGLE_CLIENT_ID

# Run development server
npm run dev
```

Frontend runs at `http://localhost:5173`

### 4. Verify Setup

1. Open `http://localhost:8000/health` - should show backend is healthy
2. Open `http://localhost:5173` - should show Momentum app
3. Try demo mode (works without backend)

## 📖 Documentation

### Key Documents
- [AUTHENTICATION_ARCHITECTURE.md](AUTHENTICATION_ARCHITECTURE.md) - Complete auth & storage architecture
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Implementation details
- [ARCHITECTURE.md](ARCHITECTURE.md) - Overall system architecture
- [backend/SETUP.md](backend/SETUP.md) - Backend setup guide
- [design_prompts/CLAUDE.md](design_prompts/CLAUDE.md) - Original design specification

## 🎨 Design Philosophy

### Core Concepts

**Epics** - Large, overarching goals (e.g., "Launch lighting business")

**Directives** - Recurring activities within an epic (e.g., "Market research")

**Logs** - Individual check-in entries (the primary metric is days invested)

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

## 🔒 Security & Privacy

### Data Privacy Guarantees
- **Your data, your Drive**: All data stored in your Google Drive
- **No backend storage**: Backend never stores your progress data
- **Minimal permissions**: App can only access files it creates
- **Full control**: Export, backup, or delete data anytime
- **Revocable access**: Revoke app access via Google settings

### Security Features
- OAuth 2.0 authentication with Google
- JWT session tokens (7-day expiration)
- HTTPS in production (required)
- CORS protection
- Comprehensive input validation
- No sensitive data in logs

## 🧪 Development

### Running in Demo Mode

The app works without backend using localStorage:

```bash
cd frontend
npm run dev
```

Demo mode uses `LocalStorageService` and includes sample data.

### Running with Backend

1. Start backend: `cd backend && uvicorn main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Sign in with Google
4. Data syncs to your Google Drive

### Testing

Backend tests (to be implemented):
```bash
cd backend
pytest
```

Frontend tests (to be implemented):
```bash
cd frontend
npm test
```

## 📊 API Endpoints

### Authentication
- `POST /auth/google/signin` - Complete OAuth, get JWT
- `POST /auth/signout` - Sign out user
- `GET /auth/me` - Get current user

### Data
- `GET /api/data?file_id=...` - Load all data
- `POST /api/data?file_id=...` - Save all data

### Epics
- `POST /api/epics` - Create epic
- `PUT /api/epics/{id}` - Update epic
- `DELETE /api/epics/{id}` - Delete epic

### Directives
- `POST /api/epics/{id}/directives` - Add directive
- `PUT /api/epics/{id}/directives/{id}` - Update directive
- `DELETE /api/epics/{id}/directives/{id}` - Delete directive

### Logs
- `POST /api/logs` - Create log entry
- `DELETE /api/logs/{id}` - Delete log

All data endpoints require JWT authentication.

## 🛠️ Technology Choices

### Why React?
- Component-based UI (perfect for cards, modals)
- Rich ecosystem
- Fast development with Vite

### Why FastAPI?
- Async support for Drive API
- Automatic API documentation
- Type safety with Pydantic
- Fast and modern

### Why Google Drive?
- User owns their data
- No database to manage
- Built-in backup/sync
- Familiar to users
- OAuth integration

### Why JWT?
- Stateless authentication
- Easy horizontal scaling
- Standard, well-tested
- No session database needed

## 📈 Performance

### Current Performance
- Sign-in: ~2-3 seconds (OAuth + Drive initialization)
- Load data: ~500ms (single Drive API call)
- Save data: ~500ms (atomic update)
- CRUD operations: ~500-800ms

### Optimizations
- Single JSON file (fast reads/writes)
- File ID caching (avoid searches)
- Optimistic UI updates (frontend)
- Automatic token refresh

## 🗺️ Roadmap

### MVP (Current Status)
- [x] Backend authentication
- [x] Backend data API
- [x] Backend Google Drive integration
- [ ] Frontend GoogleDriveService implementation
- [ ] Frontend authentication UI
- [ ] End-to-end testing

### v1.1
- [ ] Create/edit/delete epics (UI)
- [ ] Create/edit/delete directives (UI)
- [ ] Weekly report view
- [ ] Offline support with sync

### Future
- [ ] AI parsing of natural language check-ins
- [ ] Voice/phone call check-ins
- [ ] Photo attachments
- [ ] Mobile app
- [ ] Real-time sync (WebSockets)
- [ ] End-to-end encryption

## 🐛 Troubleshooting

### Backend Issues

**Error: "Invalid client ID"**
- Check `GOOGLE_CLIENT_ID` in `.env`
- Ensure you copied the full ID

**Error: "Redirect URI mismatch"**
- Add `http://localhost:5173/auth/callback` in Google Console
- URIs are case-sensitive

**Error: "Module not found"**
- Run `pip install -r requirements.txt`
- Activate virtual environment

### Frontend Issues

**Blank screen**
- Check browser console for errors
- Ensure backend is running (if not using demo mode)
- Check CORS settings

**OAuth not working**
- Verify Google OAuth credentials
- Check redirect URI configuration
- Ensure backend is running

## 🤝 Contributing

This is a personal project, but suggestions and bug reports are welcome!

### Development Workflow
1. Create a feature branch
2. Make changes
3. Test locally
4. Submit pull request

### Code Style
- **Backend**: Follow PEP 8, use Black formatter
- **Frontend**: Follow ESLint rules, use Prettier
- **Types**: Full type coverage (TypeScript + Pydantic)
- **Comments**: Docstrings for all functions

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

Inspired by:
- Jira/scrum workflows (adapted for solo use)
- Atomic Habits (behavioral science)
- Tim Urban's work on procrastination
- GitHub commit graphs
- Wellness app aesthetics (Athletic Greens, David Protein)

## 📧 Contact

For questions or feedback, please open an issue.

---

**Status**: Backend complete ✅ | Frontend in progress 🚧

*Built with ❤️ for personal productivity*
