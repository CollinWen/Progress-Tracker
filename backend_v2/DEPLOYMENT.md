# Deployment Guide - Momentum API v2

This guide covers deploying the FastAPI backend to Google Cloud Run (recommended) or other platforms.

## Option 1: Google Cloud Run (Recommended)

Cloud Run is ideal for Firebase backends because:
- Automatic scaling (scales to zero when not in use)
- Pay-per-use pricing (very cost-effective for low traffic)
- Native integration with Firebase/GCP
- No server management required
- Built-in HTTPS

### Prerequisites

1. **Google Cloud Project** with billing enabled
2. **gcloud CLI** installed ([Download](https://cloud.google.com/sdk/docs/install))
3. **Docker** installed (for building containers)

### Step 1: Enable Required APIs

```bash
# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable firestore.googleapis.com
```

### Step 2: Prepare Backend for Deployment

The backend needs to use Application Default Credentials instead of a service account file when running in Cloud Run.

Update [services/firebase_service.py](services/firebase_service.py:30) to detect Cloud Run environment:

```python
def _initialize_firebase(self):
    try:
        if firebase_admin._apps:
            logger.info("Firebase already initialized")
            return

        # In Cloud Run, use Application Default Credentials
        if os.getenv("K_SERVICE"):  # Cloud Run environment variable
            logger.info("Initializing Firebase with Application Default Credentials (Cloud Run)")
            firebase_admin.initialize_app()
        else:
            # Local development: use credentials file
            cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
            if cred_path and os.path.exists(cred_path):
                logger.info(f"Initializing Firebase with credentials from {cred_path}")
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                logger.info("Initializing Firebase with default credentials")
                firebase_admin.initialize_app()

        logger.info("Firebase Admin SDK initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {str(e)}")
        raise
```

### Step 3: Build and Deploy

```bash
cd backend_v2

# Deploy to Cloud Run (this builds and deploys in one command)
gcloud run deploy momentum-api-v2 \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production,ALLOWED_ORIGINS=https://your-frontend-domain.com
```

The `--source .` flag tells Cloud Run to:
1. Automatically build a container from your Dockerfile
2. Push it to Google Container Registry
3. Deploy to Cloud Run

### Step 4: Configure Environment Variables

After initial deployment, you can update environment variables:

```bash
gcloud run services update momentum-api-v2 \
  --region us-central1 \
  --update-env-vars ENVIRONMENT=production,ALLOWED_ORIGINS=https://your-frontend.com,https://your-other-domain.com
```

### Step 5: Get Your API URL

```bash
gcloud run services describe momentum-api-v2 \
  --region us-central1 \
  --format 'value(status.url)'
```

This will output something like: `https://momentum-api-v2-xxx-uc.a.run.app`

### Step 6: Update Frontend

Update your frontend to use the Cloud Run URL:

```typescript
// frontend/.env.production
VITE_API_BASE_URL=https://momentum-api-v2-xxx-uc.a.run.app
```

### Cost Optimization

Cloud Run pricing is based on:
- Requests (free tier: 2 million requests/month)
- CPU/Memory usage while handling requests
- Instances scale to zero when idle

For a personal app, this will likely stay in the free tier.

To optimize costs:
```bash
gcloud run services update momentum-api-v2 \
  --region us-central1 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --concurrency 80
```

---

## Option 2: Railway

Railway provides easy deployment with a generous free tier.

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login and Initialize

```bash
cd backend_v2
railway login
railway init
```

### Step 3: Add Environment Variables

In Railway dashboard:
- Go to your project
- Click "Variables"
- Add:
  - `ENVIRONMENT=production`
  - `ALLOWED_ORIGINS=https://your-frontend.com`
  - `FIREBASE_CREDENTIALS_PATH` (not needed if using service account JSON)
  - `FIREBASE_CREDENTIALS_JSON` (paste entire service account JSON)

Update [services/firebase_service.py](services/firebase_service.py:30) to support JSON env var:

```python
# Check for credentials JSON in environment variable
cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
if cred_json:
    import json
    cred_dict = json.loads(cred_json)
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)
```

### Step 4: Deploy

```bash
railway up
```

---

## Option 3: Heroku

### Step 1: Install Heroku CLI

Download from [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)

### Step 2: Create App and Deploy

```bash
cd backend_v2
heroku login
heroku create momentum-api-v2

# Add buildpack for Python
heroku buildpacks:set heroku/python

# Set environment variables
heroku config:set ENVIRONMENT=production
heroku config:set ALLOWED_ORIGINS=https://your-frontend.com
heroku config:set FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}'

# Deploy
git push heroku main
```

---

## Option 4: Docker + Any Platform

If you want to deploy to any platform that supports Docker:

### Step 1: Build Docker Image

```bash
cd backend_v2
docker build -t momentum-api-v2 .
```

### Step 2: Test Locally

```bash
docker run -p 8000:8000 \
  -e ENVIRONMENT=development \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  -e FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}' \
  momentum-api-v2
```

### Step 3: Push to Registry

```bash
# Tag for your registry (Docker Hub, GCR, etc.)
docker tag momentum-api-v2 your-registry/momentum-api-v2:latest

# Push
docker push your-registry/momentum-api-v2:latest
```

Then deploy to your platform (AWS ECS, Azure Container Instances, DigitalOcean App Platform, etc.)

---

## Security Considerations

### 1. Service Account Permissions

Create a custom service account with minimal permissions:

```bash
# Create service account
gcloud iam service-accounts create momentum-api \
  --display-name "Momentum API Service Account"

# Grant Firestore access
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:momentum-api@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# For Cloud Run, also grant Firebase Auth access
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:momentum-api@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebase.sdkAdminServiceAgent"
```

### 2. CORS Configuration

Always set specific origins in production:

```bash
# BAD - Don't allow all origins
ALLOWED_ORIGINS=*

# GOOD - Specify exact domains
ALLOWED_ORIGINS=https://momentum.yourdomain.com,https://www.yourdomain.com
```

### 3. Firestore Security Rules

Ensure your Firestore rules are properly configured (see [README.md](README.md))

### 4. API Authentication

All endpoints require Firebase ID tokens. Make sure your frontend:
1. Uses Firebase Authentication
2. Sends ID token in Authorization header
3. Refreshes tokens before expiry

---

## Monitoring & Logging

### Cloud Run

View logs:
```bash
gcloud run services logs read momentum-api-v2 \
  --region us-central1 \
  --limit 50
```

View metrics in [Cloud Console](https://console.cloud.google.com/run)

### Health Checks

Monitor your API health:
```bash
curl https://your-api-url.run.app/health
```

Set up uptime monitoring with:
- Google Cloud Monitoring
- UptimeRobot
- Pingdom

---

## CI/CD Setup

### GitHub Actions for Cloud Run

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]
    paths:
      - 'backend_v2/**'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - id: auth
      uses: google-github-actions/auth@v1
      with:
        credentials_json: ${{ secrets.GCP_SA_KEY }}

    - name: Deploy to Cloud Run
      uses: google-github-actions/deploy-cloudrun@v1
      with:
        service: momentum-api-v2
        region: us-central1
        source: ./backend_v2
        env_vars: |
          ENVIRONMENT=production
          ALLOWED_ORIGINS=${{ secrets.ALLOWED_ORIGINS }}
```

Add secrets to GitHub:
- `GCP_SA_KEY`: Service account JSON
- `ALLOWED_ORIGINS`: Your frontend URLs

---

## Troubleshooting

### "Permission denied" errors
- Verify service account has Firestore permissions
- Check Firestore security rules
- Ensure Firebase Admin SDK initialized correctly

### CORS errors
- Add frontend domain to `ALLOWED_ORIGINS`
- Use exact domain (include https:// or http://)
- Clear browser cache

### "Firebase not initialized"
- Check environment variables are set
- Verify credentials JSON is valid
- Check application logs for initialization errors

### Slow cold starts
- Cloud Run: Set `--min-instances 1` (costs more but eliminates cold starts)
- Optimize container size by using multi-stage builds

---

## Recommended: Cloud Run + Custom Domain

### Step 1: Map Custom Domain

```bash
gcloud run domain-mappings create \
  --service momentum-api-v2 \
  --domain api.yourdomain.com \
  --region us-central1
```

### Step 2: Update DNS

Add the DNS records shown in the command output to your domain registrar.

### Step 3: Wait for SSL Certificate

Cloud Run automatically provisions SSL certificates. This takes 10-30 minutes.

### Step 4: Update Frontend

```typescript
// frontend/.env.production
VITE_API_BASE_URL=https://api.yourdomain.com
```

---

## Next Steps

After deployment:

1. ✅ Test all API endpoints
2. ✅ Verify Firestore data isolation
3. ✅ Set up monitoring/alerting
4. ✅ Configure backups (Firestore auto-backups available)
5. ✅ Update frontend to use production API URL
6. ✅ Test authentication flow end-to-end
