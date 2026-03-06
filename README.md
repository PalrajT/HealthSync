# HealthSync

HealthSync is a healthcare web platform designed to securely store personal medical records and simplify doctor appointment management. It provides role-based access for patients, doctors, and administrators with a modern, responsive UI.

## Project Objectives

- Help people keep their medical records safe in one place.
- Make it easy to book and manage doctor appointments online.
- Reduce the need for paper-based health documents.
- Improve access to personal health data anytime, anywhere.
- Provide administrators with oversight of the entire platform.

## Key Features

### For Patients

- **Secure Authentication** — Sign-up/login with JWT-based authentication, password reset via email.
- **Profile Management** — View and edit personal health data (name, phone, age, gender, blood group, chronic conditions, profile photo).
- **Upload & Organize Medical Records** — Upload PDFs and images to Cloudinary, categorized by type (Lab Report, Prescription, Scan/X-Ray, Discharge Summary, Insurance, Other).
- **Medical History Dashboard** — Dedicated page with record stats, filter by type, sort by date or name, search by filename.
- **Download & Print Records** — One-click download or print for offline use and sharing.
- **Book Appointments Online** — Select a doctor, pick date and time, describe symptoms.
- **Appointment Reminders** — Color-coded countdown (Today, Tomorrow, In X days) on the dashboard for upcoming appointments.
- **AI Health Chatbot** — Intent-based chatbot for quick health tips and platform guidance.

### For Doctors

- **Secure Authentication** — Dedicated doctor login with license verification.
- **Profile Management** — View and edit professional details (specialization, experience, consultation fee, clinic address, gender).
- **Appointment Management** — View, accept, and manage patient appointment requests.
- **Medical History Access** — Browse the medical history dashboard to review records.
- **Patient Records Access** — View medical records of patients who have appointments with the doctor, with search, filter, and sort capabilities.

### For Admins

- **Admin Dashboard** — Overview with platform statistics (total patients, doctors, appointments).
- **Patient Management** — View, search, and deactivate patient accounts.
- **Doctor Management** — View, search, and deactivate doctor accounts.
- **Appointment Oversight** — View all appointments across the platform with status tracking.
- **Appointment Reminders** — Send email reminders to patients with appointments scheduled for the next day.

### Security & Architecture

- **Helmet** — HTTP security headers for protection against common web vulnerabilities.
- **Rate Limiting** — General API rate limit (200 req/15min) and stricter auth rate limit (20 req/15min).
- **Role-Based Route Protection** — Frontend `ProtectedRoute` component enforces role-based access (patient, doctor, admin).
- **Role-Based Authorization** — Backend `authorize()` middleware restricts API endpoints by user role.
- **Centralized API Config** — Single `config.js` module with all API helpers, token management, and auth utilities.
- **Global Error Handling** — Consistent JSON error responses from the backend with environment-aware stack traces.

## Benefits of the Project

- **Centralized medical data:** Easy access to all health records in one place.
- **Reduced paperwork:** Environment-friendly and clutter-free management.
- **24/7 accessibility:** Patients can access their data anytime.
- **Better organization:** Easier tracking of medical history and appointments.
- **Time saving:** Quick appointment booking and record retrieval.
- **Doctor-patient connectivity:** Doctors can access patient records for informed consultations.
- **Admin oversight:** Full platform management via a dedicated admin panel.
- **Data security:** Secured with encryption, JWT-based login, helmet headers, and rate limiting.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js 19, React Router 7, Vite 7, Tailwind CSS 3, Custom CSS (responsive) |
| Backend | Node.js, Express.js 5 |
| Database | MongoDB with Mongoose ODM |
| Authentication | JWT (JSON Web Tokens), bcryptjs |
| Security | Helmet (HTTP headers), express-rate-limit |
| File Storage | Cloudinary via multer-storage-cloudinary |
| Email | Nodemailer (password reset, appointment reminders) |
| Dev Tools | Git, GitHub, VS Code, Postman |

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account (for file uploads)
- Gmail account with App Password (for email features)

### Environment Setup

Copy `.env.example` to `.env` in the project root and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRE` | Token expiry (e.g., `7d`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `EMAIL_USER` | Gmail address for sending emails |
| `EMAIL_PASS` | Gmail App Password |
| `FRONTEND_URL` | Frontend URL for CORS (default: `http://localhost:5173`) |

### Backend

```bash
npm install
node backend/server.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend API on `http://localhost:5000`.

### API Health Check

- `GET /` — Server status
- `GET /api/health` — Database connection status

## Project Structure

```
HealthSync/
├── backend/
│   ├── server.js              # Consolidated backend (models, routes, middleware)
│   └── seedLicenses.js        # Seed valid doctor license numbers
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main router with ProtectedRoute guards
│   │   ├── config.js          # Centralized API config & helpers
│   │   ├── components/
│   │   │   └── ProtectedRoute.jsx  # Role-based route protection
│   │   └── pages/
│   │       ├── admin-login.jsx          # Admin authentication
│   │       ├── admin-dashboard.jsx      # Admin control panel
│   │       ├── doctor-dashboard.jsx     # Doctor portal
│   │       ├── doctor-patient-records.jsx # Doctor's patient records viewer
│   │       ├── patient-dashboard.jsx    # Patient portal
│   │       ├── medical-history.jsx      # Medical records dashboard
│   │       ├── patient-appointment.jsx  # Patient appointment booking
│   │       ├── doctor-appointment.jsx   # Doctor appointment management
│   │       └── ...                      # Other pages
│   └── package.json
├── .env.example               # Environment variable template
├── package.json               # Root (backend) dependencies
└── README.md
```

## User Roles

| Role | Login Route | Dashboard |
|------|-------------|-----------|
| Patient | `/patient-login` | `/patient-dashboard` |
| Doctor | `/doctor-login` | `/doctor-dashboard` |
| Admin | `/admin-login` | `/admin-dashboard` |

## Hardware Requirements

### For Development Team

- **OS:** Windows 10/11, macOS, or Linux
- **RAM:** Minimum 8 GB
- **Processor:** Intel i5 or equivalent (or higher)
- **Disk:** SSD with 50 GB free space
- **Internet:** Stable broadband connection

### For End Users

- **Device:** Smartphone, tablet, laptop, or desktop
- **Browser:** Latest Chrome, Firefox, Edge, or Safari
- **Internet:** Minimum 3 Mbps recommended for smooth operation
