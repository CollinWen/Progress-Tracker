#!/bin/bash

# Deployment script for Momentum API v2 to Google Cloud Run
# Usage: ./deploy.sh [region] [project-id]

set -e  # Exit on error

# Configuration
SERVICE_NAME="momentum-api-v2"
DEFAULT_REGION="us-central1"
PLATFORM="managed"

# Parse arguments
REGION="${1:-$DEFAULT_REGION}"
PROJECT_ID="${2:-$(gcloud config get-value project)}"

echo "========================================"
echo "Deploying Momentum API v2 to Cloud Run"
echo "========================================"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo "Project: $PROJECT_ID"
echo ""

# Confirm deployment
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
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
  --max-instances 3 \
  --timeout 60

# Get service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --format 'value(status.url)')

echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo "Service URL: $SERVICE_URL"
echo ""
echo "Next steps:"
echo "1. Test health endpoint: curl $SERVICE_URL/health"
echo "2. Set environment variables if needed:"
echo "   gcloud run services update $SERVICE_NAME \\"
echo "     --region $REGION \\"
echo "     --update-env-vars ALLOWED_ORIGINS=https://your-frontend.com"
echo "3. View logs: gcloud run services logs read $SERVICE_NAME --region $REGION"
echo ""
