# iOS Reminders Manager API

A Node.js backend service for managing iOS reminders with Firebase Firestore integration and iOS Shortcuts compatibility.

## Features

- RESTful API for reminders and lists management
- Firebase Firestore for data storage
- Docker containerization
- Google Cloud Run deployment
- API key authentication
- iOS Shortcuts integration

## Setup and Development

### Prerequisites

- Node.js 20 or higher
- Firebase project with Firestore enabled
- Google Cloud Platform account (for deployment)
- Docker (for containerization and local testing)

### Local Development

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/ios-reminders-manager.git
   cd ios-reminders-manager
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file from the example
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` to add your configuration values.

4. Create a Firebase service account key:
   - Go to your Firebase project settings
   - Navigate to "Service accounts"
   - Click "Generate new private key"
   - Save the JSON file as `serviceAccountKey.json` in the project root

5. Start the development server
   ```bash
   npm run dev
   ```

### Building and Running with Docker

1. Build the Docker image
   ```bash
   docker build -t ios-reminders-manager .
   ```

2. Run the container
   ```bash
   docker run -p 8080:8080 --env-file .env ios-reminders-manager
   ```

## Deployment

### Google Cloud Run Deployment

1. Make the deployment script executable
   ```bash
   chmod +x deploy-to-cloud-run.sh
   ```

2. Create required secrets in Google Secret Manager:
   ```bash
   # Generate a random API key
   openssl rand -hex 32 > api-key.txt
   
   # Generate a token secret for iOS Shortcuts
   openssl rand -hex 32 > shortcut-token.txt
   
   # Create secrets
   gcloud secrets create ios-reminders-api-key --data-file=./api-key.txt
   gcloud secrets create ios-reminders-shortcut-token --data-file=./shortcut-token.txt
   gcloud secrets create ios-reminders-sa-key --data-file=./serviceAccountKey.json
   ```

3. Update the deployment script with your project details:
   - Edit `PROJECT_ID` in `deploy-to-cloud-run.sh`
   - Update `REGION` if needed
   - Modify any other settings as needed

4. Run the deployment script
   ```bash
   ./deploy-to-cloud-run.sh
   ```

## API Endpoints

### Authentication

All API endpoints require an API key, which should be passed in the `X-API-Key` header:

```
X-API-Key: your-api-key
```

### Lists

- `GET /api/lists` - Get all reminder lists
- `GET /api/lists/:id` - Get a specific list by ID
- `POST /api/lists` - Create a new list
- `GET /api/lists/:id/reminders` - Get all reminders in a list

### Reminders

- `GET /api/reminders` - Get all reminders
- `GET /api/reminders/next/one` - Get the next highest priority reminder
- `GET /api/reminders/:id` - Get a specific reminder by ID
- `POST /api/reminders` - Create a new reminder
- `PUT /api/reminders/:id` - Update a reminder
- `PUT /api/reminders/:id/archive` - Archive a reminder
- `DELETE /api/reminders/:id` - Delete a reminder

## iOS Shortcuts Integration

To use this API with iOS Shortcuts:

1. Generate a shortcut token by calling:
   ```
   POST /api/reminders/token
   ```
   This requires the API key.

2. Use the token in your shortcut by passing it in the `X-Shortcut-Token` header or as a `token` query parameter.

3. The shortcut endpoint is:
   ```
   POST /api/reminders/shortcut
   ```
   
4. Example request body:
   ```json
   {
     "action": "create",
     "data": {
       "title": "My reminder",
       "list_name": "Personal"
     }
   }
   ```

## Security Best Practices

- Never commit your `.env` file or `serviceAccountKey.json` to version control
- Rotate your API keys regularly
- Use separate API keys for different clients/users
- In production, always use HTTPS
- Enable Google Cloud Armor for additional protection
- Monitor your service for suspicious activity

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.