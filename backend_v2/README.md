# Momentum API v2 - Firebase Backend

Firebase/Firestore-based backend for the Momentum progress tracking application.

## Quick Links

- **[Setup Instructions](#setup-instructions)** - Get started with development
- **[Deployment Guide](DEPLOYMENT.md)** - Deploy to Cloud Run, Railway, or other platforms
- **[Multi-Environment Setup](ENVIRONMENTS.md)** - Configure UAT and Production environments
- **[API Documentation](#api-endpoints)** - Complete endpoint reference

## Architecture

This backend uses Firebase/Firestore for NoSQL document storage instead of Google Drive JSON files. Key improvements:

- **Efficient Updates**: Individual documents updated instead of rewriting entire dataset
- **Offline Support**: Built-in offline persistence with automatic sync queue
- **Real-time Sync**: Native support for real-time updates (future feature)
- **Security**: Firestore security rules for user data isolation
- **Scalability**: Automatic scaling without manual file management

## Firestore Collection Structure

```
/users/{userId}
  - name: string
  - createdAt: timestamp

/users/{userId}/epics/{epicId}
  - id: string
  - name: string
  - emoji: string
  - description: string
  - checkinInterval: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  - createdAt: timestamp
  - deadline?: string
  - target?: object

/users/{userId}/epics/{epicId}/directives/{directiveId}
  - id: string
  - name: string
  - type: 'primary' | 'secondary'
  - progressType: 'task' | 'ongoing'
  - isComplete: boolean
  - createdAt: timestamp

/users/{userId}/checkins/{checkinId}
  - id: string
  - epicId: string
  - directiveId: string
  - timestamp: string
  - durationMinutes?: number
  - sessionType?: 'quick' | 'blocked' | 'deep'
  - note?: string
  - source?: string
```

## Setup Instructions

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new Firebase project (or use existing)
3. Enable **Firestore Database**:
   - Go to Firestore Database
   - Click "Create database"
   - Start in production mode (we'll add security rules later)
   - Choose a location close to your users
4. Enable **Authentication**:
   - Go to Authentication
   - Click "Get Started"
   - Enable "Google" sign-in provider
   - Add your domain to authorized domains

### 2. Service Account Credentials

1. In Firebase Console, go to Project Settings (gear icon)
2. Go to "Service Accounts" tab
3. Click "Generate new private key"
4. Save the JSON file securely (DO NOT commit to git)
5. Note the file path for configuration

### 3. Backend Configuration

1. Copy the environment template:
   ```bash
   cd backend_v2
   cp .env.example .env
   ```

2. Edit `.env` with your Firebase credentials:
   ```
   ENVIRONMENT=development
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CREDENTIALS_PATH=/absolute/path/to/serviceAccountKey.json
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   DEBUG=true
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### 4. Firestore Security Rules

Add these security rules in Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Epics subcollection
      match /epics/{epicId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        // Directives subcollection
        match /directives/{directiveId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }

      // Checkins collection
      match /checkins/{checkinId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 5. Run the Server

```bash
cd backend_v2
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

All endpoints require Firebase ID token in Authorization header:
```
Authorization: Bearer <firebase-id-token>
```

### Health Check
- `GET /` - Basic health check
- `GET /health` - Detailed health check

### Data (Backwards Compatibility)
- `GET /api/data` - Get all user data in MomentumData format

### Epics
- `GET /api/epics` - List all epics
- `POST /api/epics` - Create new epic
- `GET /api/epics/{epic_id}` - Get single epic
- `PUT /api/epics/{epic_id}` - Update epic
- `DELETE /api/epics/{epic_id}` - Delete epic and all directives/checkins

### Directives
- `GET /api/epics/{epic_id}/directives` - List directives for an epic
- `POST /api/epics/{epic_id}/directives` - Create directive
- `PUT /api/epics/{epic_id}/directives/{directive_id}` - Update directive
- `DELETE /api/epics/{epic_id}/directives/{directive_id}` - Delete directive

### Check-ins (Logs)
- `GET /api/logs?epic_id={epic_id}` - List check-ins (optionally filtered by epic)
- `POST /api/logs` - Create check-in
- `DELETE /api/logs/{log_id}` - Delete check-in

## Migration from v1 (Google Drive)

The v2 API maintains the same endpoint structure as v1, but authentication changes:

**v1 (Google Drive):**
- Used Google OAuth access tokens
- Required `file_id` parameter for user's data file

**v2 (Firebase):**
- Uses Firebase ID tokens (from Firebase Authentication)
- User ID extracted from token, no `file_id` needed

To migrate your frontend:

1. Replace Google OAuth with Firebase Authentication
2. Use Firebase ID token instead of access token
3. Remove `file_id` from API calls
4. Update base URL to point to v2 backend

## Development

### Project Structure
```
backend_v2/
├── config.py                  # Configuration settings
├── main.py                    # FastAPI application
├── requirements.txt           # Python dependencies
├── models/
│   └── momentum.py           # Pydantic data models
├── services/
│   ├── firebase_service.py   # Firebase Admin SDK initialization
│   └── firestore_service.py  # Firestore CRUD operations
└── middleware/
    └── auth.py               # Firebase Auth token verification
```

### Adding New Features

1. **New Data Model**: Update [models/momentum.py](models/momentum.py)
2. **New Collection**: Add methods to [services/firestore_service.py](services/firestore_service.py:28)
3. **New Endpoint**: Add route to [main.py](main.py:1)
4. **Authentication**: All endpoints automatically use Firebase Auth via dependency injection

## Troubleshooting

### "Firebase not initialized" error
- Check that `FIREBASE_CREDENTIALS_PATH` points to valid service account JSON
- Verify the file has correct permissions

### "Permission denied" on Firestore operations
- Check Firestore security rules
- Verify Firebase ID token is valid
- Ensure user ID in token matches document path

### CORS errors
- Add your frontend URL to `ALLOWED_ORIGINS` in `.env`
- Check that frontend sends credentials with requests

## Environment Management

This project supports multiple environments (UAT and Production). See [ENVIRONMENTS.md](ENVIRONMENTS.md) for:

- Setting up separate Firebase projects for UAT and Production
- Deploying to multiple environments
- CI/CD configuration for each environment
- Testing and promotion workflow

### Quick Deploy Commands

```bash
# Deploy to UAT
./deploy-uat.sh

# Deploy to Production
./deploy-prod.sh
```

## Next Steps

- [ ] Set up UAT and Production Firebase projects (see [ENVIRONMENTS.md](ENVIRONMENTS.md))
- [ ] Update frontend to use Firebase Authentication
- [ ] Configure CI/CD for automated deployments
- [ ] Implement real-time listeners in frontend
- [ ] Add offline queue for check-ins
- [ ] Set up Firebase Hosting for frontend
- [ ] Add Firestore indexes for complex queries
- [ ] Implement data export functionality
