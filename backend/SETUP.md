# Backend Setup Guide

## Prerequisites

- Python 3.10 or higher
- Google Cloud Platform account
- pip or poetry for package management

## 1. Google Cloud Console Setup

### Step 1: Create a Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### Step 2: Enable APIs
1. Navigate to "APIs & Services" → "Library"
2. Enable the following APIs:
   - **Google Drive API** (for storing user data)
   - **Google People API** (for user profile info - replaces deprecated Google+ API)

### Step 3: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Configure OAuth consent screen (if not done):
   - **User Type**: External
   - **App name**: Momentum
   - **User support email**: Your email
   - **Developer contact**: Your email
   - **Scopes**: Add the following scopes:
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - **Test users**: Add your email for testing
4. Create OAuth client:
   - **Application type**: Web application
   - **Name**: Momentum Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (development)
     - Add your production URL later
   - **Authorized redirect URIs**:
     - `http://localhost:5173/auth/callback` (development)
     - Add your production URL later
5. Copy the **Client ID** and **Client Secret**

### Step 4: Configure OAuth Consent Screen
1. Go to "OAuth consent screen"
2. Add your logo (optional)
3. Add privacy policy and terms of service URLs (optional for development)
4. Save

## 2. Backend Configuration

### Step 1: Create Virtual Environment
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables
```bash
# Copy example file
cp .env.example .env

# Edit .env with your values
nano .env  # or use your preferred editor
```

Update the following values in `.env`:
```bash
GOOGLE_CLIENT_ID=<your_client_id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your_client_secret>
JWT_SECRET=$(openssl rand -hex 32)  # Generate a secure random string
```

## 3. Running the Backend

### Development Mode
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Verify Setup
1. Open `http://localhost:8000/` in your browser
2. You should see: `{"message": "Momentum API", "version": "1.0.0"}`
3. Check health: `http://localhost:8000/health`

## 4. Testing OAuth Flow

### Manual Test
1. Start the backend server
2. Open the frontend at `http://localhost:5173`
3. Click "Sign in with Google"
4. You should be redirected to Google's OAuth consent screen
5. Authorize the app
6. You should be redirected back and signed in

### API Testing with curl

**Test Health Endpoint:**
```bash
curl http://localhost:8000/health
```

**Test Sign In (After Implementing):**
```bash
# This will be used by the frontend
curl -X POST http://localhost:8000/auth/google/signin \
  -H "Content-Type: application/json" \
  -d '{"code": "auth_code_from_google"}'
```

## 5. Troubleshooting

### Error: "Invalid client ID"
- Double-check your `GOOGLE_CLIENT_ID` in `.env`
- Ensure you copied the full client ID including `.apps.googleusercontent.com`

### Error: "Redirect URI mismatch"
- Ensure `http://localhost:5173/auth/callback` is added to "Authorized redirect URIs" in Google Cloud Console
- URIs are case-sensitive and must match exactly

### Error: "Access blocked: This app's request is invalid"
- Check OAuth consent screen configuration
- Ensure required scopes are added
- Add your email to test users

### Error: "Token has expired"
- JWT tokens expire after 7 days (configurable in `.env`)
- Users need to sign in again

### Error: "Google Drive API has not been used in project"
- Ensure Google Drive API is enabled in Google Cloud Console
- Wait a few minutes after enabling

## 6. Security Notes

### Development
- `.env` file is gitignored (do not commit secrets!)
- Use `http://localhost` for development only
- JWT secret should be randomly generated

### Production
- **MUST use HTTPS** for OAuth (Google requires it)
- Update `ALLOWED_ORIGINS` to your production domain
- Update OAuth redirect URIs in Google Cloud Console
- Use a secure JWT secret (32+ characters)
- Consider using environment variables instead of `.env` file
- Enable rate limiting
- Enable audit logging

## 7. Next Steps

After setup:
1. Test authentication flow
2. Verify Google Drive file creation
3. Test data read/write operations
4. Implement frontend GoogleDriveService
5. Deploy to production

## 8. Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [FastAPI Security Documentation](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
