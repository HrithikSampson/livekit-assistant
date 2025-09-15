# LiveKit Application

A real-time audio/video application built with LiveKit, Next.js, and Firebase.



## Local Development

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Firebase project
- LiveKit server

### Setup

1. **Clone and setup environment:**
   ```bash
   git clone <repository-url>
   cd livekit-app
   ```

2. **Environment files are already configured:**
   - `frontend.env` - Contains frontend environment variables
   - `backend.env` - Contains backend environment variables
   
   Run the setup script to create the proper .env files:
   ```bash
   ./setup-env.sh
   ```

3. **Environment variables are already configured with your credentials:**
   - LiveKit API keys and secrets
   - Firebase configuration
   - OpenAI API key
   - Google API key
   - Groq API key

   **Note:** You'll need to add your Firebase service account key as `serviceAccountKey.json` in the root directory for the backend to work properly.

4. **Start with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

5. **Or run individually:**
   ```bash
   # Frontend
   cd frontend
   npm install
   npm run dev

   # Backend
   cd backend
   npm install
   npm run dev
   ```

## Production Deployment

### AWS ECS/Fargate Deployment

1. **Setup AWS Infrastructure:**
   ```bash
   cd deploy
   # Update infrastructure.sh with your VPC, subnet, and security group IDs
   ./infrastructure.sh
   ```

2. **Configure AWS Parameters:**
   Store your secrets in AWS Systems Manager Parameter Store:
   ```bash
   aws ssm put-parameter --name "/livekit/api-key" --value "your_key" --type "SecureString"
   aws ssm put-parameter --name "/livekit/api-secret" --value "your_secret" --type "SecureString"
   aws ssm put-parameter --name "/livekit/url" --value "wss://your-server.com" --type "String"
   aws ssm put-parameter --name "/firebase/db-url" --value "https://your-project.firebaseio.com" --type "String"
   aws ssm put-parameter --name "/firebase/service-account" --value '{"type":"service_account",...}' --type "SecureString"
   aws ssm put-parameter --name "/openai/api-key" --value "your_key" --type "SecureString"
   ```

3. **Deploy:**
   ```bash
   # Update deploy.sh with your AWS account ID and resource IDs
   ./deploy.sh
   ```

### Manual Docker Deployment

1. **Build and run with production compose:**
   ```bash
   docker-compose -f docker-compose.prod.yml up --build -d
   ```

## API Endpoints

### Frontend API Routes

- `POST /api/createToken` - Create LiveKit access token
- `GET /api/getPendingRooms` - Get pending rooms
- `POST /api/updateRoomStatus` - Update room status
- `GET /api/health` - Health check

### Backend API

- `POST /health` - Health check endpoint

## Security Considerations

### Critical Security Issues Fixed

1. **Firebase Database Rules** - Implemented proper authentication-based rules
2. **Input Validation** - Added Zod validation for all API endpoints
3. **Authentication** - Created middleware for JWT token validation
4. **Rate Limiting** - Implemented rate limiting to prevent abuse
5. **Environment Variables** - Moved sensitive data to environment variables
6. **Service Account Keys** - Protected Firebase service account keys

### Additional Security Measures

- Use HTTPS in production
- Implement proper CORS policies
- Regular security audits
- Monitor for suspicious activity
- Keep dependencies updated

## Monitoring and Logging

- CloudWatch logs for ECS tasks
- Health check endpoints
- Error tracking and monitoring
- Performance metrics

## Troubleshooting

### Common Issues

1. **Firebase Connection Issues:**
   - Verify service account key
   - Check database rules
   - Ensure proper environment variables

2. **LiveKit Connection Issues:**
   - Verify API keys and secrets
   - Check LiveKit server status
   - Validate token generation

3. **Docker Build Issues:**
   - Check Dockerfile syntax
   - Verify package.json dependencies
   - Ensure proper build context

### Health Checks

- Frontend: `GET /api/health`
- Backend: `POST /health`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Add your license here]
