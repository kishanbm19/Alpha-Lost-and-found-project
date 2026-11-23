# 🎒 Smart Campus Lost & Found — Backend API

A production-ready **FastAPI** backend for a campus-wide Lost & Found platform featuring **multimodal AI similarity matching** (CLIP image embeddings + MiniLM text embeddings stored in PostgreSQL `pgvector`), **Cloudinary** media storage, **role-based JWT authentication**, and an **admin verification workflow** with hidden ownership clues.

---

## 🏗️ System Architecture & Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **API Framework** | FastAPI + Uvicorn (Python 3.11+) | Async REST API, `multipart/form-data` uploads, auto-generated OpenAPI/Swagger docs |
| **Database & Vectors** | PostgreSQL (Neon Cloud) + `pgvector` | Relational storage + `VECTOR(512)` & `VECTOR(384)` similarity columns |
| **ORM & Validation** | SQLAlchemy 2.x + Pydantic v2 | Schema validation, SQL mapping, and strict privacy filtering (`hidden_details`) |
| **Authentication** | JWT (`python-jose`) + Bcrypt (`passlib`) | `HTTPBearer` token auth with `student` and `admin` role guards |
| **Media Storage** | Cloudinary SDK | External image hosting returning public HTTPS `secure_url` links |
| **AI Matching Engine** | Hugging Face Inference API + NumPy | Background embedding generation (`clip-vit-base-patch32` + `all-MiniLM-L6-v2`) & cosine similarity ranking |

---

## 📁 Project Structure

```text
smart-campus-lost-and-found-backend/
├── app/
│   ├── main.py                  # FastAPI app initialization, CORS, lifespan DB bootstrap
│   ├── config.py                # Pydantic settings loader (.env)
│   ├── database.py              # SQLAlchemy engine, session dependency, pgvector init
│   ├── models.py                # ORM tables: users, items, claims, matches, notifications
│   ├── schemas.py               # Request/response Pydantic schemas (strips hidden_details publicly)
│   ├── auth.py                  # Password hashing, JWT creation, HTTPBearer & admin guards
│   ├── routers/
│   │   ├── auth.py              # POST /auth/register, POST /auth/login, GET /auth/me
│   │   ├── items.py             # CRUD for lost/found items, image upload, AI match lookup
│   │   ├── claims.py            # Student claim submissions & status tracking
│   │   ├── admin.py             # Admin claim review (side-by-side hidden clues) & approval/rejection
│   │   └── notifications.py     # In-app match and claim alerts
│   └── services/
│       ├── cloudinary_svc.py    # Image validation & Cloudinary upload handler
│       └── ai_matcher.py        # Background CLIP + MiniLM embedding & cosine similarity engine
├── .env.example                 # Environment variable template
├── .gitignore                   # Ignores .env, venv, __pycache__, IDE files
├── requirements.txt             # Python dependencies
└── README.md                    # Project documentation
```

---

## 🗄️ Database Schema (`PostgreSQL + pgvector`)

1. **`users`**: Stores `id` (UUID), `full_name`, `email` (unique), `password_hash`, `role` (`student` | `admin`), and `created_at`.
2. **`items`**: Stores lost/found reports (`report_type`, `title`, `description`, `category`, `location`, `event_date`, `image_url`, `hidden_details`, `status`), plus `image_embedding VECTOR(512)` and `text_embedding VECTOR(384)`.
3. **`claims`**: Tracks ownership requests (`item_id`, `claimant_id`, `proof_description`, `status`: `pending` | `approved` | `rejected`, `admin_notes`).
4. **`matches`**: Stores AI-computed `lost_item_id` ↔ `found_item_id` pairs with `image_score`, `text_score`, `combined_score`, and `is_dismissed`.
5. **`notifications`**: Delivers in-app alerts (`match_found`, `claim_submitted`, `claim_resolved`) to users.

---

## 🚀 Local Setup & Installation

### 1. Clone the Repository & Install Dependencies
```bash
git clone <your-github-repo-url>
cd smart-campus-lost-and-found-backend

python -m venv venv
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
pip install "psycopg[binary]"
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://neondb_owner:<password>@<host>.neon.tech/neondb?sslmode=require
SECRET_KEY=<64-char-hex-from-secrets.token_hex(32)>
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_EMAIL_DOMAIN=
CORS_ORIGINS=http://localhost:5173,[http://127.0.0.1:5173](http://127.0.0.1:5173)

CLOUDINARY_CLOUD_NAME=<your_cloud_name>
CLOUDINARY_API_KEY=<your_api_key>
CLOUDINARY_API_SECRET=<your_api_secret>

HF_TOKEN=hf_<your_hugging_face_token>
```
> **Note:** Leave `ALLOWED_EMAIL_DOMAIN=` blank during local testing to allow any email domain, or set it to your campus domain (e.g., `nie.ac.in`) in production.

### 3. Start the Development Server
```bash
python -m uvicorn app.main:app --reload
```
* **API Base URL:** `http://127.0.0.1:8000`
* **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`

On startup, `init_db()` automatically enables the `vector` extension and creates all 5 tables if they do not already exist.

---

## 🔌 API Endpoints Overview

### Authentication (`/auth`)
* `POST /auth/register` — Register a new student account and receive a JWT token.
* `POST /auth/login` — Authenticate with `{ "email", "password" }` and receive a Bearer token.
* `GET /auth/me` — Fetch the currently authenticated user's profile and role.

### Items & AI Matching (`/items`)
* `POST /items` (`multipart/form-data`) — Report a `lost` or `found` item with optional image upload (uploaded to Cloudinary) and `hidden_details`. Triggers background AI matching.
* `GET /items` — List and filter items by `report_type`, `category`, `status`, and search query (`q`). *(`hidden_details` is stripped from all public responses.)*
* `GET /items/{item_id}` — Get full public details for a specific item.
* `GET /items/{item_id}/matches` — Retrieve AI-ranked candidate matches for a lost/found item.
* `PATCH /items/{item_id}/status` — Update item status (`open`, `claimed`, `resolved`).

### Claims & Admin Verification (`/claims` & `/admin`)
* `POST /claims` — Submit an ownership claim with `proof_description` for a found item.
* `GET /claims/me` — View claims submitted by the logged-in student.
* `GET /admin/claims` *(Admin only)* — View pending claims alongside the reporter's private `item_hidden_details` for verification.
* `PATCH /admin/claims/{claim_id}` *(Admin only)* — Approve or reject a claim, automatically updating item status and notifying the claimant.

### Notifications (`/notifications`)
* `GET /notifications` — List notifications for the current user.
* `PATCH /notifications/{notification_id}/read` — Mark a notification as read.

---

## 🧠 Notes for Teammates

### For Frontend Developers
* Authenticate requests by passing `Authorization: Bearer <access_token>` in request headers.
* Submit new items to `POST /items` using `FormData` (do not manually set `Content-Type`; let the browser set the `multipart/form-data` boundary).
* Render item photos directly via `<img src={item.image_url} />`—Cloudinary returns public HTTPS URLs.

### For ML / AI Developers
* Embedding generation and scoring live in `app/services/ai_matcher.py`.
* **Models Used:** `openai/clip-vit-base-patch32` (512-d image vectors) and `sentence-transformers/all-MiniLM-L6-v2` (384-d text vectors) via `huggingface_hub.InferenceClient`.
* **Scoring Formula:** When both image embeddings exist, `combined_score = 0.60 * image_cosine + 0.40 * text_cosine`; otherwise `combined_score = text_cosine`. Pairs scoring `>= 0.72` are saved to `matches` and trigger user notifications.
* To promote a test account to Admin in Neon SQL Editor:
  ```sql
  UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';
  ```
