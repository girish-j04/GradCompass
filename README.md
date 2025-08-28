# GradCompass

**AI-Powered Graduate Application Assistant**

GradCompass is a comprehensive platform that guides students through their graduate school application journey using artificial intelligence. From university matching to visa interview preparation, the platform provides personalized insights and recommendations tailored to each student's unique profile.

## Features

### Core AI Agents

- **University Matcher**: Find universities that match your profile and preferences using AI-powered recommendations
- **Document Helper**: Get assistance crafting compelling SOPs and application essays
- **Exam Planner**: Plan your GRE, TOEFL, or IELTS preparation with personalized study schedules
- **Finance Planner**: Budget planning and funding options exploration
- **Visa Assistant**: Visa requirements guidance and mock interview sessions

### Key Capabilities

- **Profile Management**: Comprehensive academic and personal profile setup
- **Real-time Mock Interviews**: WebSocket-powered visa interview simulations
- **Progress Tracking**: Profile completion tracking and requirement validation
- **Multi-country Support**: Application guidance for 17+ countries
- **Personalized Analytics**: Detailed insights based on your academic background

## Technology Stack

### Frontend
- **React 19.1.1** - Modern UI framework
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **React Router** - Client-side routing
- **Zustand** - Lightweight state management
- **React Hook Form** - Form handling with Yup validation

### Backend
- **FastAPI** - High-performance Python web framework
- **SQLAlchemy** - ORM with async support
- **Alembic** - Database migrations
- **AsyncPG** - PostgreSQL async driver
- **Pydantic** - Data validation and serialization

### AI & Language Models
- **Google Gemini 2.0** - Advanced language model via LangChain
- **LangGraph** - AI workflow orchestration
- **LangChain** - LLM application framework

### Database
- **PostgreSQL** - Primary database
- **JWT Authentication** - Secure user authentication with passlib

## Prerequisites

- **Node.js** 16.0 or higher
- **Python** 3.8 or higher
- **PostgreSQL** 12.0 or higher
- **Google AI API Key** (for Gemini integration)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/gradcompass.git
cd gradcompass
```

### 2. Backend Setup

```bash
cd api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration:
# - DATABASE_URL
# - GEMINI_API_KEY
# - JWT_SECRET_KEY
# - etc.

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start the development server
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Project Structure

```
gradcompass/
├── api/                          # FastAPI backend
│   ├── app/
│   │   ├── config.py            # Configuration settings
│   │   ├── database.py          # Database connection
│   │   ├── main.py              # FastAPI application
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── profile.py
│   │   │   └── interview.py
│   │   ├── routers/             # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── profile.py
│   │   │   └── interview.py
│   │   ├── services/            # Business logic
│   │   │   └── interview_service.py
│   │   └── utils/               # Utility functions
│   │       └── profile.py
│   ├── alembic/                 # Database migrations
│   └── requirements.txt
├── client/                      # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components
│   │   │   ├── LandingPage.js
│   │   │   ├── DashboardPage.js
│   │   │   └── ProfileSetupPage.js
│   │   ├── stores/              # Zustand state management
│   │   ├── utils/               # Frontend utilities
│   │   └── App.js
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql+asyncpg://username:password@localhost/gradcompass
GEMINI_API_KEY=your_google_ai_api_key
JWT_SECRET_KEY=your_jwt_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=development
```

## Usage

### 1. Profile Setup
- Complete your academic background (college, major, GPA)
- Add test scores (GRE, TOEFL, IELTS)
- Define goals and preferences (target degree, countries, budget)
- Add work experience details

### 2. AI Agent Interaction
- Use the University Matcher to find suitable programs
- Get document assistance for SOPs and essays
- Plan exam preparation schedules
- Explore funding and budget options
- Practice visa interviews

### 3. Mock Visa Interviews
- Real-time WebSocket-based interview sessions
- AI-powered officer responses
- Comprehensive feedback and improvement suggestions
- Session history and progress tracking

## API Documentation

The API follows RESTful conventions with the following main endpoints:

- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `GET /profile/me` - Get user profile
- `PUT /profile/me` - Update user profile
- `POST /interview/sessions` - Create interview session
- `WebSocket /interview/ws/{session_id}` - Real-time interview

Full API documentation is available at `/docs` when running the server.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Guidelines

### Code Style
- Frontend: ESLint + Prettier configuration
- Backend: Black formatter + isort for imports
- Follow conventional commit messages

### Testing
```bash
# Backend tests
cd api
pytest

# Frontend tests
cd client
npm test
```

## Performance Considerations

- **Database**: Async operations with connection pooling
- **Caching**: Redis integration recommended for production
- **WebSocket**: Efficient real-time communication for interviews
- **AI Responses**: Streaming support for better UX

## Security

- JWT-based authentication with secure token handling
- Input validation using Pydantic models
- CORS configuration for secure cross-origin requests
- Environment variable management for sensitive data

## Deployment

### Docker Support
Docker configuration files are included for containerized deployment:

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Production Considerations
- Use PostgreSQL with proper connection pooling
- Implement Redis for session management and caching
- Configure reverse proxy (Nginx) for load balancing
- Set up proper logging and monitoring
- Use environment-specific configuration

## Support

For issues, questions, or contributions:
- Create an issue in the GitHub repository
- Check the API documentation at `/docs`
- Review the contribution guidelines

---

**GradCompass** - Transforming graduate school applications with AI-powered guidance and personalized insights.