#!/bin/bash

# Deploy to Production environment
# Usage: ./deploy-prod.sh

set -e

# Configuration
SERVICE_NAME="momentum-api-prod"
PROJECT_ID="momentum-prod"  # Change to your Production Firebase project ID
REGION="us-central1"
PLATFORM="managed"

echo "========================================"
echo "⚠️  PRODUCTION DEPLOYMENT ⚠️"
echo "========================================"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo "Project: $PROJECT_ID"
echo ""
echo "This will deploy to the PRODUCTION environment!"
echo ""

# Require explicit confirmation
read -p "Are you SURE you want to deploy to PRODUCTION? Type 'yes' to continue: " -r
echo
if [[ ! $REPLY == "yes" ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Set project
echo "Setting project..."
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com --quiet
gcloud services enable run.googleapis.com --quiet
gcloud services enable firestore.googleapis.com --quiet

# Deploy to Cloud Run
echo ""
echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --platform "$PLATFORM" \
  --region "$REGION" \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 60 \
  --set-env-vars ENVIRONMENT=production

# Get service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --format 'value(status.url)')

echo ""
echo "========================================"
echo "✅ Production Deployment Complete!"
echo "========================================"
echo "Service URL: $SERVICE_URL"
echo ""
echo "⚠️  IMPORTANT: Post-deployment checklist"
echo "1. Test health endpoint: curl $SERVICE_URL/health"
echo "2. Verify CORS origins are set correctly:"
echo "   gcloud run services describe $SERVICE_NAME --region $REGION --format='value(spec.template.spec.containers[0].env)'"
echo "3. Test authentication flow with production Firebase project"
echo "4. Monitor logs for errors: gcloud run services logs read $SERVICE_NAME --region $REGION"
echo "5. Set up uptime monitoring"
echo "6. Update production frontend with API URL"
echo ""
echo "Set CORS if needed:"
echo "gcloud run services update $SERVICE_NAME \\"
echo "  --region $REGION \\"
echo "  --update-env-vars ALLOWED_ORIGINS=https://yourdomain.com"
echo ""
