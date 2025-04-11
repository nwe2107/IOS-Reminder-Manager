#!/bin/bash
set -e

# Configuration - Replace these with your actual values
PROJECT_ID="ios-reminders-manager-456109"  # Your GCP project ID
SERVICE_NAME="ios-reminders-manager"
REGION="me-west1"  # Update to your preferred region

# Secret names in Secret Manager
API_KEY_SECRET_NAME="ios-reminders-api-key"
SA_KEY_SECRET_NAME="ios-reminders-sa-key"
SHORTCUT_TOKEN_SECRET_NAME="ios-reminders-shortcut-token"

# Step 1: Check for required tools
if ! command -v gcloud &> /dev/null; then
  echo "Error: Google Cloud SDK (gcloud) is required but not installed."
  echo "Please install it from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  echo "Error: Docker is required but not installed."
  echo "Please install it from: https://docs.docker.com/get-docker/"
  exit 1
fi

# Step 2: Ensure we're logged in to gcloud
echo "🔍 Checking gcloud authentication..."
gcloud auth print-access-token &> /dev/null || (
  echo "Not logged in to gcloud. Please run: gcloud auth login"
  exit 1
)

# Step 3: Set default project
echo "✅ Setting default project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Step 4: Enable required APIs if not already enabled
echo "🔌 Enabling required Google Cloud APIs..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com

# Step 5: Create service account for the Cloud Run service if it doesn't exist
SERVICE_ACCOUNT="${SERVICE_NAME}-sa@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT &> /dev/null; then
  echo "🔑 Creating service account $SERVICE_ACCOUNT..."
  gcloud iam service-accounts create "${SERVICE_NAME}-sa" \
    --display-name="${SERVICE_NAME} Service Account"
  
  # Grant necessary permissions
  echo "🔒 Granting permissions to service account..."
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"
  
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/datastore.user"
fi

# Step 6: Build and tag the Docker image
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME:$(date +%Y%m%d-%H%M%S)"
echo "🔨 Building and pushing Docker image: $IMAGE_NAME..."
docker build -t $IMAGE_NAME .
docker push $IMAGE_NAME

# Step 7: Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --service-account $SERVICE_ACCOUNT \
  --set-env-vars NODE_ENV=production,GOOGLE_APPLICATION_CREDENTIALS=/secrets/FIREBASE_CONFIG \
  --set-secrets "API_KEY=${API_KEY_SECRET_NAME}:latest" \
  --set-secrets "SHORTCUT_TOKEN_SECRET=${SHORTCUT_TOKEN_SECRET_NAME}:latest" \
  --set-secrets FIREBASE_CONFIG=${SA_KEY_SECRET_NAME}:latest \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 80 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 10

# Step 8: Output the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)")
echo "✅ Deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "Next steps:"
echo "1. Store your secrets in Secret Manager if you haven't already:"
echo "   gcloud secrets create ${API_KEY_SECRET_NAME} --data-file=./api-key.txt"
echo "   gcloud secrets create ${SHORTCUT_TOKEN_SECRET_NAME} --data-file=./shortcut-token.txt"
echo "   gcloud secrets create ${SA_KEY_SECRET_NAME} --data-file=./serviceAccountKey.json"
echo ""
echo "2. Test your API with:"
echo "   curl -H \"X-API-Key: your-api-key\" ${SERVICE_URL}/api/lists"