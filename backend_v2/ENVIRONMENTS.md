# Multi-Environment Setup Guide

This guide covers setting up separate UAT (User Acceptance Testing) and Production environments for your Firebase backend.

## Strategy Overview

### Recommended Approach: Separate Firebase Projects

The best practice is to use **separate Firebase projects** for each environment:

- **momentum-dev** - Development/UAT environment
- **momentum-prod** - Production environment

**Why?**
- Complete data isolation between environments
- Independent Firestore databases
- Separate authentication users
- Different security rules for testing
- No risk of test data polluting production
- Clear billing separation

### Alternative Approach: Single Project with Namespacing

Use one Firebase project with different Firestore collection prefixes:
- Collections: `/uat_users/...`, `/prod_users/...`

**Not recommended because:**
- Harder to manage security rules
- Shared billing/quotas
- Risk of cross-environment contamination
- Can't test security rule changes safely

---

## Setup: Separate Firebase Projects (Recommended)

### Step 1: Create Two Firebase Projects

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create **momentum-uat** project:
   - Enable Firestore Database
   - Enable Authentication (Google provider)
   - Note the project ID
3. Create **momentum-prod** project:
   - Enable Firestore Database
   - Enable Authentication (Google provider)
   - Note the project ID

### Step 2: Generate Service Account Keys

For each project:

1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as:
   - `serviceAccountKey-uat.json` (for UAT)
   - `serviceAccountKey-prod.json` (for production)
4. Store securely (add to `.gitignore`)

### Step 3: Configure Firestore Security Rules

Apply the same security rules to both projects:

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

### Step 4: Create Environment Configuration Files

Create separate config files for each environment:

**`.env.uat`:**
```bash
ENVIRONMENT=uat
FIREBASE_PROJECT_ID=momentum-uat
FIREBASE_CREDENTIALS_PATH=./serviceAccountKey-uat.json
ALLOWED_ORIGINS=https://uat.yourdomain.com,http://localhost:3000
DEBUG=true
```

**`.env.prod`:**
```bash
ENVIRONMENT=production
FIREBASE_PROJECT_ID=momentum-prod
FIREBASE_CREDENTIALS_PATH=./serviceAccountKey-prod.json
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
DEBUG=false
```

### Step 5: Update `.gitignore`

```bash
# Environment files
.env
.env.local
.env.uat
.env.prod
*.json
serviceAccountKey*.json
```

---

## Deployment Options

### Option A: Cloud Run with Separate Services

Deploy to separate Cloud Run services:

**UAT Service:**
```bash
gcloud run deploy momentum-api-uat \
  --source ./backend_v2 \
  --platform managed \
  --region us-central1 \
  --project momentum-uat \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=uat,ALLOWED_ORIGINS=https://uat.yourdomain.com
```

**Production Service:**
```bash
gcloud run deploy momentum-api-prod \
  --source ./backend_v2 \
  --platform managed \
  --region us-central1 \
  --project momentum-prod \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production,ALLOWED_ORIGINS=https://yourdomain.com
```

**Result:**
- UAT: `https://momentum-api-uat-xxx.run.app`
- Prod: `https://momentum-api-prod-xxx.run.app`

### Option B: Single Project, Different Services

Deploy both to the same Google Cloud project:

```bash
# UAT
gcloud run deploy momentum-api-uat \
  --source ./backend_v2 \
  --region us-central1 \
  --project your-gcp-project \
  --set-env-vars ENVIRONMENT=uat,FIREBASE_PROJECT_ID=momentum-uat

# Production
gcloud run deploy momentum-api-prod \
  --source ./backend_v2 \
  --region us-central1 \
  --project your-gcp-project \
  --set-env-vars ENVIRONMENT=production,FIREBASE_PROJECT_ID=momentum-prod
```

---

## Local Development

### Running Different Environments Locally

**Start UAT:**
```bash
cd backend_v2
export $(cat .env.uat | xargs)
uvicorn main:app --reload --port 8000
```

**Start Production (testing):**
```bash
cd backend_v2
export $(cat .env.prod | xargs)
uvicorn main:app --reload --port 8001
```

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api-uat:
    build: ./backend_v2
    ports:
      - "8000:8080"
    env_file:
      - ./backend_v2/.env.uat
    environment:
      - PORT=8080
    volumes:
      - ./backend_v2:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8080 --reload

  api-prod:
    build: ./backend_v2
    ports:
      - "8001:8080"
    env_file:
      - ./backend_v2/.env.prod
    environment:
      - PORT=8080
    volumes:
      - ./backend_v2:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

Run both:
```bash
docker-compose up
```

---

## Enhanced Deployment Scripts

### `deploy-uat.sh`

```bash
#!/bin/bash
set -e

SERVICE_NAME="momentum-api-uat"
PROJECT_ID="momentum-uat"
REGION="us-central1"

echo "Deploying to UAT environment..."

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --platform managed \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars ENVIRONMENT=uat,ALLOWED_ORIGINS=https://uat.yourdomain.com

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format 'value(status.url)')

echo "UAT deployment complete: $SERVICE_URL"
```

### `deploy-prod.sh`

```bash
#!/bin/bash
set -e

SERVICE_NAME="momentum-api-prod"
PROJECT_ID="momentum-prod"
REGION="us-central1"

echo "⚠️  PRODUCTION DEPLOYMENT"
read -p "Are you sure you want to deploy to PRODUCTION? (yes/no) " -r
if [[ ! $REPLY == "yes" ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo "Deploying to Production environment..."

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --platform managed \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars ENVIRONMENT=production,ALLOWED_ORIGINS=https://yourdomain.com

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format 'value(status.url)')

echo "Production deployment complete: $SERVICE_URL"
echo "⚠️  Remember to test thoroughly!"
```

---

## CI/CD with GitHub Actions

### Separate Workflows

**`.github/workflows/deploy-uat.yml`:**
```yaml
name: Deploy to UAT

on:
  push:
    branches: [develop]
    paths:
      - 'backend_v2/**'
  workflow_dispatch:

env:
  PROJECT_ID: momentum-uat
  SERVICE_NAME: momentum-api-uat
  REGION: us-central1

jobs:
  deploy:
    name: Deploy to UAT
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Authenticate to Google Cloud
      uses: google-github-actions/auth@v2
      with:
        credentials_json: ${{ secrets.GCP_SA_KEY_UAT }}

    - name: Deploy to Cloud Run
      run: |
        gcloud run deploy ${{ env.SERVICE_NAME }} \
          --source ./backend_v2 \
          --platform managed \
          --region ${{ env.REGION }} \
          --project ${{ env.PROJECT_ID }} \
          --allow-unauthenticated \
          --set-env-vars ENVIRONMENT=uat,ALLOWED_ORIGINS=${{ secrets.ALLOWED_ORIGINS_UAT }}

    - name: Get URL and test
      run: |
        URL=$(gcloud run services describe ${{ env.SERVICE_NAME }} \
          --region ${{ env.REGION }} --project ${{ env.PROJECT_ID }} \
          --format 'value(status.url)')
        echo "UAT URL: $URL"
        curl -f $URL/health || exit 1
```

**`.github/workflows/deploy-prod.yml`:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths:
      - 'backend_v2/**'
  workflow_dispatch:

env:
  PROJECT_ID: momentum-prod
  SERVICE_NAME: momentum-api-prod
  REGION: us-central1

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval

    steps:
    - uses: actions/checkout@v4

    - name: Authenticate to Google Cloud
      uses: google-github-actions/auth@v2
      with:
        credentials_json: ${{ secrets.GCP_SA_KEY_PROD }}

    - name: Deploy to Cloud Run
      run: |
        gcloud run deploy ${{ env.SERVICE_NAME }} \
          --source ./backend_v2 \
          --platform managed \
          --region ${{ env.REGION }} \
          --project ${{ env.PROJECT_ID }} \
          --allow-unauthenticated \
          --set-env-vars ENVIRONMENT=production,ALLOWED_ORIGINS=${{ secrets.ALLOWED_ORIGINS_PROD }}

    - name: Get URL and test
      run: |
        URL=$(gcloud run services describe ${{ env.SERVICE_NAME }} \
          --region ${{ env.REGION }} --project ${{ env.PROJECT_ID }} \
          --format 'value(status.url)')
        echo "Production URL: $URL"
        curl -f $URL/health || exit 1

    - name: Create deployment notification
      run: |
        echo "🚀 Production deployment successful!"
```

**GitHub Secrets Needed:**
- `GCP_SA_KEY_UAT` - Service account key for UAT project
- `GCP_SA_KEY_PROD` - Service account key for prod project
- `ALLOWED_ORIGINS_UAT` - UAT frontend URLs
- `ALLOWED_ORIGINS_PROD` - Production frontend URLs

---

## Frontend Configuration

### Environment Files

**`frontend/.env.uat`:**
```bash
VITE_API_BASE_URL=https://momentum-api-uat-xxx.run.app
VITE_FIREBASE_API_KEY=your_uat_api_key
VITE_FIREBASE_AUTH_DOMAIN=momentum-uat.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=momentum-uat
```

**`frontend/.env.production`:**
```bash
VITE_API_BASE_URL=https://momentum-api-prod-xxx.run.app
VITE_FIREBASE_API_KEY=your_prod_api_key
VITE_FIREBASE_AUTH_DOMAIN=momentum-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=momentum-prod
```

### Build Commands

```bash
# Build for UAT
npm run build -- --mode uat

# Build for production
npm run build -- --mode production
```

---

## Environment Management Best Practices

### 1. Branch Strategy

```
main (production)
  ↑
develop (UAT)
  ↑
feature/* (local dev)
```

- **feature/** → merge to **develop** → auto-deploy to UAT
- **develop** → merge to **main** → manual approval → deploy to production

### 2. Testing Flow

1. **Local Development**
   - Use UAT Firebase project
   - Test features locally

2. **UAT Deployment**
   - Auto-deploy from `develop` branch
   - QA team tests in UAT environment
   - Verify with real Firebase data

3. **Production Deployment**
   - Merge to `main` after UAT approval
   - Require manual approval in GitHub Actions
   - Monitor deployment carefully

### 3. Data Management

**UAT:**
- Seed with test data
- Can be reset/cleared regularly
- Use for testing migrations

**Production:**
- Real user data
- Never manually modify
- Regular backups

### 4. Firestore Backups

Enable automatic backups for production:

```bash
gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=weekly \
  --retention=4w \
  --project=momentum-prod
```

### 5. Monitoring

**UAT:**
- Basic logging
- Error tracking (optional)

**Production:**
- Full error tracking (Sentry, etc.)
- Uptime monitoring
- Performance monitoring
- Alerting for critical errors

### 6. Security Rules Testing

Test security rule changes in UAT first:

1. Update rules in UAT Firestore
2. Test thoroughly with UAT frontend
3. If successful, apply to production
4. Monitor for access errors

---

## Cost Management

### UAT Environment
- Use smaller instances (512Mi memory)
- Lower max instances (3)
- Can scale to zero

### Production Environment
- Larger instances if needed (1Gi memory)
- Higher max instances (10+)
- Consider min-instances=1 for faster response

### Estimated Costs (per month)

**Free Tier Eligible:**
- Cloud Run: 2M requests, 360k GB-seconds
- Firestore: 50k reads, 20k writes, 1GB storage
- Authentication: Unlimited

**If exceeding free tier:**
- UAT: ~$5-10/month (light usage)
- Production: Depends on traffic (~$20-50 for small app)

---

## Quick Reference Commands

### Deploy to UAT
```bash
./deploy-uat.sh
```

### Deploy to Production
```bash
./deploy-prod.sh
```

### View UAT logs
```bash
gcloud run services logs read momentum-api-uat \
  --region us-central1 --project momentum-uat
```

### View Production logs
```bash
gcloud run services logs read momentum-api-prod \
  --region us-central1 --project momentum-prod
```

### Update UAT environment variables
```bash
gcloud run services update momentum-api-uat \
  --region us-central1 --project momentum-uat \
  --update-env-vars ALLOWED_ORIGINS=https://uat.yourdomain.com
```

### Update Production environment variables
```bash
gcloud run services update momentum-api-prod \
  --region us-central1 --project momentum-prod \
  --update-env-vars ALLOWED_ORIGINS=https://yourdomain.com
```

---

## Troubleshooting

### Users can't authenticate between environments
- UAT and production have separate user databases
- Users need to sign up in each environment
- This is intentional for data isolation

### Wrong data showing in frontend
- Check `.env` file is loading correct Firebase config
- Verify API URL matches environment
- Clear browser local storage

### Deployment fails with "permission denied"
- Verify correct service account key for environment
- Check project ID matches Firebase project
- Ensure APIs are enabled in correct project

### Firestore rules not working
- Rules are per-project, not per-service
- Verify rules are deployed to correct Firebase project
- Test rules in Firebase Console → Firestore → Rules playground
