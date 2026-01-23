# Momentum Backend API

Python FastAPI backend for the Momentum progress tracking application.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your Google OAuth credentials
```

4. Run the development server:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Structure

```
backend/
├── main.py              # FastAPI application and routes
├── requirements.txt     # Python dependencies
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore patterns
└── README.md           # This file
```

## Endpoints

### Authentication
- `POST /auth/google/signin` - Initiate Google OAuth flow
- `POST /auth/signout` - Sign out current user
- `GET /auth/me` - Get current user info

### Data Operations
- `GET /api/data` - Load all user data
- `POST /api/data` - Save all user data

### Epics
- `POST /api/epics` - Create new epic
- `PUT /api/epics/{epic_id}` - Update epic
- `DELETE /api/epics/{epic_id}` - Delete epic

### Directives
- `POST /api/epics/{epic_id}/directives` - Add directive to epic
- `PUT /api/epics/{epic_id}/directives/{directive_id}` - Update directive
- `DELETE /api/epics/{epic_id}/directives/{directive_id}` - Delete directive

### Logs
- `POST /api/logs` - Create check-in log
- `DELETE /api/logs/{log_id}` - Delete log

## TODO

- [ ] Implement Google OAuth 2.0 flow
- [ ] Implement Google Drive API integration
- [ ] Add JWT authentication
- [ ] Add request/response models with Pydantic
- [ ] Add proper error handling
- [ ] Add logging
- [ ] Add tests
- [ ] Add database models (if needed beyond Google Drive)
