# Project Identity

**Name:** DocAI  
**Purpose:** A collaborative document editing platform with AI-powered features  
**Tech Stack:** Django + Django Ninja (Backend) | Next.js 15 + React 19 (Frontend)  
**Audience:** Teams and individuals who need real-time collaborative document editing with AI assistance  
**Current Branch:** `user-invites` - implementing collaborative document sharing features

**Overarching Goals:**
- Provide seamless document collaboration with user invitation system
- Integrate AI-powered document assistance
- Modern, fast, and secure authentication (JWT + Google OAuth)
- Clean API-driven architecture suitable for scaling and separation

---

# Design Philosophy

## Coding Style
- **Backend:** Service-oriented architecture with clear separation of concerns
  - Controllers (API routes) → Services (business logic) → Models (data layer)
  - Schema-driven validation using Pydantic (Django Ninja)
  - Custom exceptions for error handling
  - Strategic caching for performance optimization
  
- **Frontend:** Modern React with functional patterns
  - Functional components with hooks (no class components)
  - SWR for data fetching and cache management
  - Server-side and client-side rendering (Next.js App Router)
  - Composition over configuration

## Aesthetic & Tone
- **Clean and minimal:** Professional UI using Shadcn UI components
- **Developer-friendly:** Clear code structure, descriptive naming, modular design
- **Modern web standards:** HTTP-only cookies, JWT tokens, PKCE OAuth flow
- **Pragmatic:** Use proven patterns, avoid over-engineering

## Core Principles
1. **Separation of concerns:** API logic stays in services, not controllers
2. **Type safety:** Use schemas on backend (Pydantic), gradually improve frontend typing
3. **Security first:** Proper auth flows, permission checks in services, CSRF protection
4. **Performance aware:** Strategic caching, efficient queries, lazy loading
5. **Maintainability:** Clear file structure, consistent patterns across features

---

# Core Architecture

## High-Level System Overview
```
Frontend (Next.js)  →  API Proxy  →  Django Backend
     ↓                                      ↓
  Auth Context                      Django Ninja API
  SWR Cache                         Service Layer
  Shadcn UI                         Models + Cache
```

## Backend Structure (`backend/src/`)
```
cfehome/          # Django project settings and main config
accounts/         # User authentication and account management
documents/        # Document CRUD and collaboration
  ├── models.py      # Doc, DocUser models
  ├── schemas.py     # Pydantic schemas for validation
  ├── services.py    # Business logic layer
  ├── api.py         # Django Ninja API routes
  ├── exceptions.py  # Custom exceptions
googler/          # Google OAuth integration
ai/               # AI integration endpoints
helpers/          # Shared utilities (auth controllers, permissions)
profiles/         # User profile management
```

## Frontend Structure (`frontend/src/`)
```
app/              # Next.js 15 App Router
  ├── api/           # API proxy routes to backend
  ├── docs/          # Document pages
  ├── login/         # Auth pages
  ├── google/        # OAuth callbacks
components/
  ├── authProvider.jsx    # Auth state management
  ├── editor/             # CKEditor integration
  ├── layout/             # Navigation and layout
  ├── ui/                 # Shadcn UI components
lib/              # Utilities (fetcher, auth helpers)
```

## Key Dependencies
**Backend:**
- Django 5.1.5
- Django Ninja (API framework)
- django-ninja-jwt (JWT authentication)
- python-decouple (environment variables)
- google-auth (OAuth)

**Frontend:**
- Next.js 15.1.6
- React 19
- SWR (data fetching)
- Shadcn UI + Radix UI
- Tailwind CSS
- CKEditor 5 (rich text editing)
- next-themes (dark mode support)

## State Management
- **Backend:** Django ORM + Redis/cache framework for strategic caching
- **Frontend:** SWR for server state, React Context for auth state, localStorage for persistence

## Authentication Flow
1. User logs in via email/password or Google OAuth
2. Backend issues JWT access token (15 min) + refresh token (1 day)
3. Tokens stored in HTTP-only cookies
4. Frontend API routes proxy requests and attach tokens automatically
5. Backend validates JWT on protected routes using `@auth=user_required`

---

# Vibe Rules (AI Style Guide)

## How to "Vibe Code" for DocAI

### Backend (Django)
- **Follow the service pattern religiously:**
  ```python
  # api.py - thin controller
  @router.get("/", response=List[DocSchema], auth=user_required)
  def document_list_view(request):
      qs = doc_services.list_documents(request.user)
      return qs
  
  # services.py - business logic
  def list_documents(user=None, force=False):
      # caching, filtering, permission logic here
  ```
  
- **Use custom exceptions, not generic HttpError:**
  ```python
  # exceptions.py
  class DocumentNotFound(Exception): pass
  
  # services.py
  raise exceptions.DocumentNotFound(f"{document_id} not found.")
  
  # api.py - translate to HTTP
  try:
      obj = doc_services.get_document(user, document_id)
  except doc_exceptions.DocumentNotFound as e:
      raise HttpError(404, f"{e}")
  ```

- **Cache strategically, invalidate explicitly:**
  ```python
  DOC_CACHE_KEY = "documents:list:{user_id}"
  cache_key = DOC_CACHE_KEY.format(user_id=user.id)
  cache.set(cache_key, qs, timeout=DOC_CACHE_TIMEOUT)
  ```

- **Permission checks in services, not views**
- **Use UUID for primary keys on user-facing models**
- **Type hints on service functions**

### Frontend (Next.js + React)
- **Use 'use client' directive explicitly for client components**
- **SWR for all data fetching:**
  ```javascript
  const {data, isLoading, error, mutate} = useSWR(apiEndpoint, fetcher)
  ```

- **Destructure hooks at top of component:**
  ```javascript
  const {docId} = useParams()
  const {isAuthenticated} = useAuth()
  const [saving, setSaving] = useState(false)
  ```

- **Handle auth errors gracefully:**
  ```javascript
  if (!isAuthenticated && error.status === 401) {
      window.location.href='/login'
  }
  ```

- **Use Shadcn UI components, not custom ones**
- **Tailwind for styling, no CSS modules**
- **Dynamic imports for heavy components (CKEditor):**
  ```javascript
  const DocEditor = dynamic(() => import('@/components/editor/DocEditor'), { ssr: false })
  ```

- **Form handling:** Native forms with controlled/uncontrolled inputs as appropriate
- **API calls through `/api/*` proxy routes, never direct to backend**

### Naming Conventions
- **Backend:**
  - Models: PascalCase (`Doc`, `DocUser`)
  - Functions: snake_case (`list_documents`, `create_document`)
  - API routes: RESTful (`/documents/`, `/documents/{id}/`)
  - Services: `{entity}_services.py`

- **Frontend:**
  - Components: PascalCase (`DocEditor`, `AuthProvider`)
  - Files: camelCase for utilities, PascalCase for components
  - Hooks: `use` prefix (`useAuth`, `useMySWR`)
  - Props: camelCase (`docId`, `initialData`)

### Documentation Style
- **Inline comments:** Use sparingly, prefer self-documenting code
- **Docstrings:** For complex service functions
- **TODO comments:** Format as `# TODO: description`
- **No over-documentation:** Code structure should speak for itself

### Things to Emulate
✅ Clean separation of concerns  
✅ Consistent error handling patterns  
✅ Strategic caching and invalidation  
✅ Permission checks in service layer  
✅ SWR for data fetching  
✅ Modern React patterns (hooks, functional components)  
✅ Type safety through schemas  

### Things to Avoid
❌ Business logic in API routes  
❌ Direct database queries in views  
❌ Generic exceptions without context  
❌ Inline styles in React  
❌ Class components  
❌ Direct backend API calls from frontend (use proxy)  
❌ Skipping permission checks  
❌ Premature optimization  

### Handling Ambiguity
- **When adding features:** Follow existing patterns in similar features
- **When uncertain about permissions:** Default to restrictive, check in services
- **When unsure about caching:** Start without cache, add if needed
- **When choosing between patterns:** Favor consistency with existing code

---

# Current State

## Latest Major Changes
- **User Invites System:** Currently on `user-invites` branch
  - `DocUser` model tracks document access permissions
  - Users can be invited to collaborate on documents
  - Permission checks include both ownership and invited users

## Active Features
✅ User authentication (email/password)  
✅ Google OAuth integration (PKCE flow)  
✅ Document CRUD operations  
✅ CKEditor integration for rich text editing  
✅ Document collaboration (owner + invited users)  
✅ JWT-based auth with HTTP-only cookies  
✅ Dark mode support (next-themes)  

## Known Design Tensions
- **Monorepo structure:** Backend and frontend in one repo for convenience, but recommended to split for long-term maintenance
- **Caching strategy:** Currently using cache.get/set, may need Redis for production
- **Permission model:** Simple owner + invited users, may need roles/permissions later
- **Database:** SQLite for dev, PostgreSQL for production (via DATABASE_URL)

## Technical Debt
- Frontend could benefit from TypeScript migration (currently JavaScript)
- Some API error handling could be more consistent
- Test coverage needs improvement
- Consider adding API rate limiting

## Current Focus Areas
1. Completing user invitation system
2. Improving document collaboration features
3. AI integration endpoints
4. Performance optimization (caching, query optimization)

---

# AI Interaction Notes

## User Preferences
- **Code style:** Clean, modern, pragmatic
- **Verbosity:** Concise explanations, code-first approach
- **Documentation:** Prefer self-documenting code over heavy comments

## Recurring Contextual Reminders
- Always check permissions in service layer before operations
- Use SWR for data fetching, not useEffect + fetch
- Follow the service pattern for all backend logic
- Use custom exceptions, translate to HTTP in API layer
- API proxy routes for all frontend → backend communication
- HTTP-only cookies for JWT storage (security)

## Best Practices for Maintaining Coherence
1. **Before coding:** Review relevant files in the feature area
2. **Follow patterns:** Look at similar existing features
3. **Service layer first:** Write/update services before API routes
4. **Test auth flows:** Ensure permission checks are in place
5. **Check error handling:** Custom exceptions → HTTP errors
6. **Update schemas:** When changing models, update Pydantic schemas
7. **Clear cache:** Consider cache invalidation when mutating data

## Context Preservation Guidelines
- When adding new Django apps, follow the structure: models → schemas → exceptions → services → api
- When adding new frontend pages, use SWR + authProvider pattern
- When adding new features, update both backend services and frontend components
- Consider caching implications for any data mutations
- Document any deviation from established patterns

---

# Changelog

## 2025-10-05 - Initial Context Creation
- Created instruction_context.md based on existing codebase analysis
- Documented architecture patterns (service layer, SWR, auth flow)
- Established vibe rules for consistent code generation
- Identified current state (user-invites branch)
- Set baseline for future context evolution

---

# Quick Reference

## Common Commands
```bash
# Backend
cd backend/src
python manage.py runserver
python manage.py makemigrations
python manage.py migrate

# Frontend
cd frontend
npm run dev
npm run build

# Environment
source venv/bin/activate
```

## Key Files to Reference
- **Auth patterns:** `backend/src/helpers/api/auth/permissions.py`
- **Service pattern:** `backend/src/documents/services.py`
- **API pattern:** `backend/src/documents/api.py`
- **Frontend auth:** `frontend/src/components/authProvider.jsx`
- **Data fetching:** `frontend/src/components/useMySWR.jsx`
- **OAuth flow:** `backend/src/googler/oauth.py`

## Environment Variables
See `backend/src/cfehome/settings.py` for all configurable variables:
- `DJANGO_SECRET_KEY`
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID` / `GOOGLE_SECRET_KEY`
- `CKEDITOR_ACCESS_CREDS`
- `FRONTEND_URL`

---

> **Note to AI:** This file is your long-term memory for the DocAI project. Read it at the start of each session. Update it when you learn something new about the project's patterns, style, or architecture. Preserve and evolve this context—never overwrite without merging insights.

