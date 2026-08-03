# TRD — Technical Requirements Document
# Fute Complaint Token Generation Portal

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Tailwind CSS, Framer Motion, Lucide Icons |
| Backend | Node.js, Express.js |
| Database | Firestore (Firebase) |
| Auth | Firebase Auth (email + password) |
| Email | Nodemailer (Gmail SMTP) |
| Deployment | Vercel (frontend + backend as serverless) |
| Package Manager | npm |

---

## 2. Folder Structure

```
Project-Ticket/
├── docs/                        # All documentation
│   ├── PRD.md                   # Product Requirements
│   ├── TRD.md                   # Technical Requirements (this file)
│   └── USER_FLOW.md             # User flow diagrams and descriptions
│
└── main/
    ├── frontend/                # React application
    │   ├── public/
    │   │   └── index.html
    │   ├── src/
    │   │   ├── pages/           # One file per page/screen
    │   │   │   ├── LandingPage.jsx        # Home page with Fute branding
    │   │   │   ├── LoginPage.jsx          # Unified login (role-based routing)
    │   │   │   ├── RegisterPage.jsx       # Registration page
    │   │   │   ├── EmployeeDashboard.jsx  # Employee: view complaints + raise new
    │   │   │   ├── HRComplaintForm.jsx    # HR complaint submission form
    │   │   │   ├── ITComplaintForm.jsx    # IT complaint submission form
    │   │   │   ├── HRDashboard.jsx        # HR staff: view + manage HR complaints
    │   │   │   ├── ITDashboard.jsx        # IT staff: view + manage IT complaints
    │   │   │   ├── FounderDashboard.jsx   # Founder: all complaints unified view
    │   │   │   └── TokenSearch.jsx        # Search complaint by token
    │   │   ├── components/      # Reusable UI components
    │   │   │   ├── Navbar.jsx             # Top navigation bar
    │   │   │   ├── ComplaintCard.jsx      # Single complaint display card
    │   │   │   ├── StatusBadge.jsx        # Colored status pill (Pending/In Progress/Completed)
    │   │   │   ├── PriorityBadge.jsx      # P1/P2/P3 badge with tooltip
    │   │   │   ├── TokenDisplay.jsx       # Token shown after submission
    │   │   │   └── ProtectedRoute.jsx     # Route guard based on role
    │   │   ├── context/
    │   │   │   └── AuthContext.jsx        # Global auth state (user, role, token)
    │   │   ├── hooks/
    │   │   │   └── useComplaints.js       # Custom hook for fetching complaints
    │   │   ├── utils/
    │   │   │   ├── api.js                 # Axios instance + all API call functions
    │   │   │   ├── tokenGenerator.js      # Generates FT-HR-XXXXXX tokens
    │   │   │   └── duration.js            # Auto-calculates duration from date to now
    │   │   ├── styles/
    │   │   │   └── globals.css            # Global CSS + Tailwind imports
    │   │   ├── App.jsx                    # Root component with all routes
    │   │   └── main.jsx                   # React entry point
    │   ├── .env                           # Frontend env vars (Supabase URL, keys)
    │   ├── package.json
    │   ├── tailwind.config.js
    │   └── vite.config.js
    │
    └── backend/                 # Express API server
        ├── config/
        │   └── supabase.js              # Supabase client initialization
        ├── controllers/
        │   ├── authController.js        # Register, login, role detection logic
        │   ├── hrController.js          # CRUD for HR complaints
        │   ├── itController.js          # CRUD for IT complaints
        │   └── founderController.js     # Fetch all complaints (HR + IT combined)
        ├── middleware/
        │   ├── authMiddleware.js        # Verify JWT from Supabase
        │   └── roleMiddleware.js        # Check role (employee/hr/it/founder)
        ├── routes/
        │   ├── authRoutes.js            # POST /api/auth/register, /login
        │   ├── hrRoutes.js              # GET/POST/PATCH /api/hr/complaints
        │   ├── itRoutes.js              # GET/POST/PATCH /api/it/complaints
        │   └── founderRoutes.js         # GET /api/founder/complaints
        ├── utils/
        │   └── mailer.js                # Nodemailer setup + sendMail function
        ├── .env                         # Backend env vars (DB, SMTP, JWT secret)
        ├── server.js                    # Express app entry point
        └── package.json
```

---

## 3. Database Schema (PostgreSQL via Supabase)

### Table: `users`
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
email         TEXT UNIQUE NOT NULL
full_name     TEXT
role          TEXT CHECK (role IN ('employee', 'hr', 'it', 'founder'))
department    TEXT
created_at    TIMESTAMPTZ DEFAULT now()
```

### Table: `hr_complaints`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
token           TEXT UNIQUE NOT NULL          -- e.g. FT-HR-A3X9K2
user_id         UUID REFERENCES users(id)
name            TEXT NOT NULL
department      TEXT NOT NULL
description     TEXT NOT NULL
complaint_date  DATE NOT NULL
duration        TEXT                          -- auto-calculated on backend
submitted_at    TIMESTAMPTZ DEFAULT now()
priority        TEXT CHECK (priority IN ('P1','P2','P3'))
status          TEXT CHECK (status IN ('Pending','In Progress','Completed')) DEFAULT 'Pending'
updated_at      TIMESTAMPTZ DEFAULT now()
```

### Table: `it_complaints`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
token           TEXT UNIQUE NOT NULL          -- e.g. FT-IT-B7M2P1
user_id         UUID REFERENCES users(id)
name            TEXT NOT NULL
department      TEXT NOT NULL
category        TEXT NOT NULL
sub_category    TEXT NOT NULL
description     TEXT NOT NULL
complaint_date  DATE NOT NULL
duration        TEXT
submitted_at    TIMESTAMPTZ DEFAULT now()
priority        TEXT CHECK (priority IN ('P1','P2','P3'))
approval        BOOLEAN DEFAULT false
status          TEXT CHECK (status IN ('Pending','In Progress','Completed')) DEFAULT 'Pending'
updated_at      TIMESTAMPTZ DEFAULT now()
```

---

## 4. API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user, detect role from email |
| POST | `/api/auth/login` | Login, return JWT + role |

### HR Complaints
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/hr/complaints` | Employee, HR, Founder |
| GET | `/api/hr/complaints` | HR Staff, Founder |
| GET | `/api/hr/complaints/my` | Employee (own complaints) |
| GET | `/api/hr/complaints/search?token=` | Logged-in users |
| PATCH | `/api/hr/complaints/:id/status` | HR Staff, Founder |

### IT Complaints
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/it/complaints` | Employee, IT, Founder |
| GET | `/api/it/complaints` | IT Staff, Founder |
| GET | `/api/it/complaints/my` | Employee (own complaints) |
| GET | `/api/it/complaints/search?token=` | Logged-in users |
| PATCH | `/api/it/complaints/:id/status` | IT Staff, Founder |

### Founder
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/founder/complaints` | Founder only |

---

## 5. Role Detection Logic

```
Email contains "hr.fute"              → role = 'hr'
Email contains "system.fute" OR
  "system.futeservice"                → role = 'it'
Email manually set in DB              → role = 'founder'
All others (fute domain)              → role = 'employee'
```

---

## 6. Token Format

```
HR Token: FT-HR-[6 random alphanumeric uppercase chars]
IT Token: FT-IT-[6 random alphanumeric uppercase chars]
Example:  FT-HR-A3X9K2 | FT-IT-B7M2P1
```

---

## 7. Email Notification Triggers

| Event | Recipient | Template |
|-------|-----------|----------|
| New HR complaint submitted | HR Staff email | "New complaint received: [token]" |
| New IT complaint submitted | IT Staff email | "New complaint received: [token]" |
| HR complaint status updated | Complaint submitter | "Your complaint [token] status: [new status]" |
| IT complaint status updated | Complaint submitter | "Your complaint [token] status: [new status]" |

---

## 8. Environment Variables

### Frontend `.env`
```
VITE_API_BASE_URL=
```

### Backend `.env`
```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_API_KEY=
JWT_SECRET=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
HR_EMAIL=
IT_EMAIL=
PORT=5000
```

---

## 9. Deployment

- **Frontend**: Vercel — connect GitHub repo, set root to `main/frontend`
- **Backend**: Vercel Serverless Functions OR Railway.app — set root to `main/backend`
- **Database**: Supabase hosted PostgreSQL (free tier sufficient for v1)
