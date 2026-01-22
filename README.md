# Task Manager (Full-Stack)

A full-stack task management application with secure authentication and
user-specific data handling.  
The system supports registration, login, logout, token-based authentication,
and performance-oriented backend components.

## Key Features
- User registration, login and logout
- JWT-based authentication
- Access token + refresh token flow
- Secure token refresh mechanism
- User-specific task management
- Caching layer for optimized access
- Bloom filter usage for efficient checks
- Database migrations
- Connection pooling support

## Tech Stack

### Frontend
- React
- TypeScript
- Vite

### Backend
- TypeScript (Deno)
- JWT authentication (access & refresh tokens)
- Cache layer
- Bloom filter
- Database migrations

### Database
- SQLite (default: `file:./db/tasks.db`)
- Database location configurable via environment variables

## Authentication Flow
- Users authenticate via login endpoint
- Backend issues:
  - Access Token (short-lived)
  - Refresh Token (long-lived)
- Access token is used for protected requests
- Refresh token is used to generate a new access token when expired
- Logout invalidates the refresh token

## Environment Variables (Backend)
- `DATABASE_URL` (default: `file:./db/tasks.db`)
- `JWT_SECRET` (default: `dev-secret`)
- `PORT` (default: `8000`)

## Project Structure
- `/src` → frontend (React + TypeScript)
- `/backend` → backend service
  - authentication & token logic
  - cache & bloom filter logic
  - database and migrations


## How to Run

Backend:
cd backend
deno run -A main.ts


Frontend:
npm install
npm run dev
