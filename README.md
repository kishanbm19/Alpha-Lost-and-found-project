# Alpha Lost & Found — Smart Campus Lost and Found Platform

A web-based campus lost-and-found application. Students can report lost or found belongings, browse reports, submit ownership claims, and receive notifications. The backend includes an AI-assisted matching pipeline that compares text, images, and item metadata to identify potentially related reports.

## Features

- Student registration and login using JWT authentication.
- Role-based access for students and administrators.
- Create, browse, update, and delete lost/found item reports.
- Upload item images to Cloudinary.
- AI-assisted matching between lost and found reports.
- Store text and image embeddings in PostgreSQL using `pgvector`.
- Submit ownership claims for found items.
- Admin review and approval/rejection of claims using private ownership clues.
- In-app notifications for potential matches and claim updates.
- Interactive API documentation through FastAPI Swagger UI.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, React Router, Tailwind CSS |
| Backend | Python, FastAPI, Uvicorn |
| Database | PostgreSQL, SQLAlchemy, pgvector |
| Authentication | JWT, `python-jose`, Passlib, bcrypt |
| Image storage | Cloudinary |
| Text model | `sentence-transformers/all-MiniLM-L6-v2` |
| Image model | `openai/clip-vit-base-patch32` |
| ML libraries | Hugging Face Hub, Sentence Transformers, Transformers, PyTorch, NumPy |

## Project Structure

```text
Alpha-Lost-and-found-project/
├── Frontend/
│   ├── src/
│   │   ├── api/             # Backend API client
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # Authentication and items state
│   │   ├── data/            # Frontend data and categories
│   │   ├── pages/           # Application pages
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── README.md
│
├── smart-campus-lost-and-found-backend/
│   ├── app/
│   │   ├── routers/         # Authentication, items, claims, notifications
│   │   ├── services/        # AI matcher and Cloudinary service
│   │   ├── auth.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── .env.example
│   └── requirements.txt
│
└── README.md
```

## Prerequisites

Install the following before running the project:

- Python 3.10 or newer
- Node.js and npm
- PostgreSQL database with permission to enable the `vector` extension (for example, a compatible Neon PostgreSQL database)
- Cloudinary account
- Hugging Face account and an access token with the required Inference Provider permissions

## Configuration

### 1. Backend environment variables

Open a terminal in the backend directory:

```bash
cd smart-campus-lost-and-found-backend
```

Copy `.env.example` to `.env`.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Edit `.env` and provide your own credentials:

```env
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST/YOUR_DATABASE?sslmode=require

SECRET_KEY=replace_with_a_long_random_secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440

ALLOWED_EMAIL_DOMAIN=
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

HF_TOKEN=hf_your_hugging_face_access_token
```

Do not commit `.env` or share its contents. Keep database passwords, JWT secrets, Cloudinary credentials, and the Hugging Face token on the backend only.

`ALLOWED_EMAIL_DOMAIN` can be left empty during development. To restrict registration to a campus domain, set it to the domain only, for example `example.edu`.

### 2. Install backend dependencies

Create and activate a virtual environment.

Windows PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
python -m venv venv
source venv/bin/activate
```

Install the listed dependencies:

```bash
pip install -r requirements.txt
```

The current AI matching service imports `httpx`; if it is not already installed in your environment, install it with:

```bash
pip install httpx
```

### 3. Configure the frontend

Open another terminal and move to the frontend directory:

```bash
cd Frontend
npm install
```

The frontend API client uses this default backend URL:

```text
http://localhost:8000
```

To use a different backend URL, create a `Frontend/.env` file:

```env
VITE_API_URL=http://localhost:8000
```

Restart the Vite development server after changing frontend environment variables.

## Run the Application

Run the backend and frontend in separate terminals.

### Start the backend

From `smart-campus-lost-and-found-backend`, with the virtual environment activated:

```bash
uvicorn app.main:app --reload
```

Backend base URL:

```text
http://localhost:8000
```

Swagger API documentation:

```text
http://localhost:8000/docs
```

Health check:

```text
http://localhost:8000/health
```

At startup, the backend calls `init_db()`, which attempts to enable PostgreSQL's `vector` extension and creates the SQLAlchemy tables if they do not exist. The database user must have the necessary permissions, and the PostgreSQL server must support `pgvector`.

### Start the frontend

From the `Frontend` directory:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, normally:

```text
http://localhost:5173
```

To create a production frontend build:

```bash
npm run build
```

## AI Matching Workflow

When a student submits a lost or found item, the backend saves the report and schedules the matching pipeline as a background task.

1. The backend builds text input from the item's title, category, and description.
2. It requests a text embedding using the Hugging Face Inference API and the MiniLM model.
3. If the hosted text inference request is unavailable or does not return the expected vector, the current matcher attempts a local Sentence Transformers fallback.
4. If the report has an image, the backend downloads it from its image URL and generates an image embedding using the locally loaded CLIP model.
5. The embeddings are stored on the item record in PostgreSQL.
6. The matcher compares the new report with open reports of the opposite type (lost versus found).
7. It combines text similarity, image similarity when both images are available, and metadata similarity.
8. Candidate pairs meeting the configured threshold are saved as match records. A notification is created for the lost item's reporter when a new match is recorded.

### Models and vector dimensions

| Model | Purpose | Embedding dimension | Execution in the current code |
|---|---|---:|---|
| `sentence-transformers/all-MiniLM-L6-v2` | Text embeddings | 384 | Hugging Face Inference API first; local Sentence Transformers fallback |
| `openai/clip-vit-base-patch32` | Image embeddings | 512 | Local Transformers/PyTorch inference; model files are obtained from Hugging Face |

**Important:** Downloading a model from Hugging Face is not the same as calling the hosted Hugging Face Inference API. In the current `app/services/ai_matcher.py`, the text model uses the hosted API first, while CLIP image inference runs locally.

The current matcher uses these starting weights:

- When both image embeddings are available: text `0.50`, image `0.35`, metadata `0.15`.
- When image similarity is unavailable: text `0.80`, metadata `0.20`.
- The configured match threshold is `0.65`.

These are configuration values in the current source code, not independently validated accuracy guarantees. They should be evaluated and tuned using representative campus lost-and-found examples.

## Database Overview

The SQLAlchemy models define these main tables:

| Table | Purpose |
|---|---|
| `users` | Student and administrator accounts |
| `items` | Lost/found reports and their text/image embeddings |
| `claims` | Ownership claim submissions and review status |
| `matches` | Candidate lost/found pairs and similarity scores |
| `notifications` | Match and claim notifications |

The `items` table stores `text_embedding` as `VECTOR(384)` and `image_embedding` as `VECTOR(512)`.

## API Overview

The backend exposes these routes. Open `/docs` while the backend is running for request schemas, response formats, and interactive testing.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register a student |
| POST | `/auth/login` | Log in and receive an access token |
| GET | `/auth/me` | Get the authenticated user's profile |
| POST | `/items` | Create a lost/found report |
| GET | `/items` | Browse and filter reports |
| GET | `/items/my` | Get the current user's reports |
| GET | `/items/{item_id}` | Get a report |
| PATCH | `/items/{item_id}` | Update a report |
| DELETE | `/items/{item_id}` | Delete a report |
| GET | `/items/{item_id}/matches` | Get matches for a report |
| PATCH | `/items/{item_id}/matches/{match_id}/dismiss` | Dismiss a match |
| POST | `/claims` | Submit an ownership claim |
| GET | `/claims/my` | Get the current user's claims |
| GET | `/admin/claims` | List claims for admin review |
| PATCH | `/admin/claims/{claim_id}` | Approve or reject a claim |
| GET | `/notifications` | List the current user's notifications |
| PATCH | `/notifications/{notification_id}/read` | Mark a notification as read |
| GET | `/health` | Check backend health |

Protected endpoints require the access token in the request header:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

The item creation endpoint accepts `multipart/form-data`. The frontend should send a `FormData` object and allow the browser to set the multipart content-type boundary.

## Important Security Notes

- Never expose `HF_TOKEN`, Cloudinary secrets, database credentials, or `SECRET_KEY` in frontend code.
- Do not commit `.env` files to source control.
- Use HTTPS and strong secrets when deploying.
- Keep `hidden_details` private; it is intended for ownership verification and should not be exposed in public item responses.
- Restrict administrator access and protect admin routes.
- The frontend and backend should both be configured for the intended deployment origins.

## Troubleshooting

### Backend cannot start because settings are missing

- Confirm that `.env` is inside `smart-campus-lost-and-found-backend/`.
- Check that all required variables in `.env` have values.
- Ensure the backend is launched from its backend directory.

### Database or `vector` extension error

- Check the database URL and credentials.
- Confirm that the PostgreSQL provider supports `pgvector`.
- Confirm that the database role can create or use the `vector` extension.
- Check the installed PostgreSQL driver and connection URL format.

### Hugging Face inference error

- Confirm that `HF_TOKEN` is valid and loaded by the backend.
- Check that the token has permission to use the required Inference Provider.
- Confirm that the selected model is available through a provider for your account.
- Check the backend logs. The current text matcher may fall back to local Sentence Transformers when hosted inference fails.

### Image embeddings are not generated

- Confirm that the report has a valid, reachable image URL.
- Check that the image can be downloaded and decoded.
- Confirm that PyTorch and Transformers are installed and that the CLIP model can be loaded.
- Check backend logs for image download or model loading errors.

### Frontend cannot connect to the backend

- Start FastAPI and confirm `http://localhost:8000/health` responds.
- Check `VITE_API_URL` in `Frontend/.env`, if configured.
- Confirm the frontend origin is allowed by backend CORS settings.
- Restart Vite after changing environment variables.

## Development Notes

- The AI matching pipeline is scheduled as a FastAPI background task after item creation and after selected item edits.
- Reports are compared only against open reports of the opposite report type.
- Reports already in the database without embeddings may need to be reprocessed before they can participate in semantic matching.
- Similarity scores and the threshold are heuristics; validate them against real test cases before relying on them operationally.
- The commands in this README describe local development. Production deployment requires separate configuration for hosting, secrets, database access, CORS, and file storage.

