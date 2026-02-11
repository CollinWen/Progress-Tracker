# Deployment Checklist

Use this checklist to ensure your Momentum app is ready for deployment.

## Prerequisites

- [ ] Firebase project created
- [ ] Firestore Database enabled
- [ ] Firebase Authentication enabled (Google provider)
- [ ] Service account key downloaded
- [ ] Docker installed (for containerized deployment)
- [ ] Google Cloud SDK installed (for Cloud Run deployment)

## Backend Deployment

### Local Setup
- [ ] Created `backend_v2/.env` from `.env.example`
- [ ] Set `FIREBASE_PROJECT_ID`
- [ ] Set `FIREBASE_CREDENTIALS_PATH` to service account key
- [ ] Set `ALLOWED_ORIGINS` to frontend URL
- [ ] Tested locally: `uvicorn main:app --reload`
- [ ] Verified `/health` endpoint returns 200

### Docker Build
- [ ] Backend Dockerfile exists
- [ ] `.dockerignore` configured
- [ ] Test build: `docker build -t momentum-backend ./backend_v2`
- [ ] Test run: `docker run -p 8000:8080 --env-file backend_v2/.env momentum-backend`

### Cloud Run Deployment
- [ ] GCP project selected
- [ ] APIs enabled (Cloud Run, Cloud Build, Firestore)
- [ ] Service account has Firestore permissions
- [ ] Deploy: `gcloud run deploy momentum-api --source ./backend_v2 --region us-central1`
- [ ] Environment variables set in Cloud Run
- [ ] Verified deployment URL works
- [ ] Tested `/health` endpoint on deployed URL

## Frontend Deployment

### Local Setup
- [ ] Created `frontend/.env` from `.env.example`
- [ ] Set `VITE_FIREBASE_API_KEY`
- [ ] Set `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] Set `VITE_FIREBASE_PROJECT_ID`
- [ ] Set `VITE_API_URL` to backend URL
- [ ] Installed dependencies: `npm install`
- [ ] Tested locally: `npm run dev`
- [ ] Tested sign-in flow

### Production Build
- [ ] Build succeeds: `npm run build`
- [ ] Build output in `dist/` directory
- [ ] Tested prod build: `npm run preview`

### Docker Build
- [ ] Frontend Dockerfile exists
- [ ] `.dockerignore` configured
- [ ] Test build: `docker build -t momentum-frontend ./frontend`
- [ ] Test run: `docker run -p 5173:80 momentum-frontend`

### Deployment (Choose One)

#### Firebase Hosting
- [ ] Firebase CLI installed
- [ ] Project initialized: `firebase init hosting`
- [ ] Deploy: `firebase deploy --only hosting`

#### Vercel
- [ ] Vercel CLI installed or GitHub connected
- [ ] Environment variables set in Vercel dashboard
- [ ] Deploy: `vercel --prod`

#### Netlify
- [ ] Netlify CLI installed or GitHub connected
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Environment variables set
- [ ] Deploy: `netlify deploy --prod`

## Firestore Configuration

- [ ] Security rules deployed (see README.md)
- [ ] Indexes created (if needed for complex queries)
- [ ] Backups enabled for production
- [ ] Tested user data isolation

## Security Checklist

- [ ] `.env` files NOT committed to git
- [ ] Service account keys NOT committed to git
- [ ] CORS configured with specific origins (not `*`)
- [ ] HTTPS enabled in production
- [ ] Firestore security rules tested
- [ ] Firebase Authentication domain authorized

## Testing

- [ ] Sign-in flow works end-to-end
- [ ] Can create epics
- [ ] Can create directives
- [ ] Can create check-ins
- [ ] Data persists to Firestore
- [ ] Data loads after page refresh
- [ ] Multiple users have isolated data

## Monitoring

- [ ] Cloud Run logging configured
- [ ] Error tracking set up (Sentry, etc.)
- [ ] Uptime monitoring configured
- [ ] Firestore quota monitoring

## Multi-Environment (Optional)

If deploying UAT and Production:

- [ ] UAT Firebase project created
- [ ] Production Firebase project created
- [ ] Separate service accounts for each
- [ ] CI/CD workflows configured
- [ ] UAT and Prod URLs documented

See [backend_v2/ENVIRONMENTS.md](backend_v2/ENVIRONMENTS.md) for details.

## Post-Deployment

- [ ] Verified production URL works
- [ ] Tested full user flow in production
- [ ] Monitored logs for errors
- [ ] Documentation updated with production URLs
- [ ] Team notified of deployment

## Rollback Plan

If issues occur:

1. **Backend**: Revert Cloud Run to previous revision
   ```bash
   gcloud run services update-traffic momentum-api --to-revisions=PREVIOUS_REVISION=100
   ```

2. **Frontend**: Roll back deployment or revert git commit and redeploy

3. **Firestore**: Data changes are permanent - ensure backups exist

## Support

- Backend docs: [backend_v2/README.md](backend_v2/README.md)
- Deployment guide: [backend_v2/DEPLOYMENT.md](backend_v2/DEPLOYMENT.md)
- Environment setup: [backend_v2/ENVIRONMENTS.md](backend_v2/ENVIRONMENTS.md)
