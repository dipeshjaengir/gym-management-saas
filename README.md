# GymLedger SaaS

GymLedger is a modern, high-performance, multi-tenant SaaS application designed for gym owners, fitness studios, and platform administrators. It provides complete operational tooling including member check-ins, automated telemetry analytics, billing and payment histories, CRM marketing boards, and a standalone Android wrapper application.

---

## 🚀 Key Features

### 🏢 Multi-Tenant Gym Management
* **Custom Branding**: Gym owners can upload logos, configure contact details, and customize console themes.
* **Member Roster**: Interactive rosters with search, status filters, and digital profile cards.
* **Plan Configurations**: Custom subscription packages (Monthly, Quarterly, Half-Yearly, Yearly) tailored for local gym requirements.

### ⚡ Attendance & QR Check-ins
* **Digital Passes**: Unique QR codes generated for every active member.
* **Scan Simulator**: Web and mobile-friendly QR scanners that simulate hardware check-in systems.
* **Access Alerts**: Instant color-coded alerts indicating active status, expired memberships, suspension lockouts, or scan errors.

### 💳 Billing & Payment Telemetry
* **Invoice Generation**: Automated receipt numbers (`REC-YYYYMMDD-XXXX`) created for all payment logs.
* **Revenue Metrics**: Real-time monthly revenue streams, active memberships counts, pending collections, and registration trends.
* **Coupon Engine**: Discount coupon codes (percentage and flat rate options) with usage limits and expiry dates.

### 📱 Native Mobile & PWA Integrations
* **Progressive Web App**: Fully service-worker enabled offline caching, apple-touch-icon, and manifest configuration.
* **Capacitor Android wrapper**: Custom native hardware back-button handlers and device permissions for seamless mobile runtime.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | MongoDB Atlas, Mongoose ODM |
| **Mobile Runtime** | Capacitor SDK |
| **Security** | Helmet, Express Rate Limit, Cookie Parser, Bcryptjs, JWT |

---

## 📁 Folder Structure

```text
Gym-Management-SaaS/
├── backend/                  # Node.js + Express + TypeScript Backend API
│   ├── src/
│   │   ├── config/           # Database connection & startup scripts
│   │   ├── middleware/       # JWT auth & Zod body validations
│   │   ├── models/           # Mongoose schemas & schemas interfaces
│   │   ├── routes/           # Endpoint controllers (auth, members, plans, etc.)
│   │   └── index.ts          # Express Server Bootstrap
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/                 # React + Vite + TypeScript Frontend SPA
│   ├── android/              # Capacitor Android Native App Project
│   ├── src/
│   │   ├── components/       # Shared UI components (Layout, Modals, Scanner)
│   │   ├── contexts/         # React Contexts (Authentication wrapper)
│   │   ├── pages/            # View pages (Landing, Login, MemberProfile, Admin)
│   │   ├── services/         # API fetch services
│   │   └── utils/            # Helper utils (Plan mapping, Version definitions)
│   ├── public/               # Manifest, Service Worker, and PWA assets
│   ├── capacitor.config.ts   # Capacitor SDK wrapper configuration
│   ├── vite.config.ts
│   └── package.json
│
├── docs/                     # Platform guides & deployment checklists
│   └── deployment_guide.md   
└── README.md                 # Project Documentation
```

---

## ⚙️ Environment Variables

Copy the environment templates into your local configurations. Never expose real production secrets in git history.

### Backend Configurations (`backend/.env`)
```ini
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/gymledger

# Security Secrets
JWT_SECRET=YOUR_SECURE_JWT_SECRET_VALUE

# SMTP Email Settings (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=YOUR_SMTP_EMAIL_ADDRESS
SMTP_PASS=YOUR_SMTP_APP_PASSWORD

# Default Platform Admin Configuration (Auto-Seeded on First Launch)
SUPERADMIN_EMAIL=YOUR_SUPERADMIN_EMAIL
SUPERADMIN_PASSWORD=YOUR_STRONG_SUPERADMIN_PASSWORD
```

### Frontend Configurations (`frontend/.env`)
```ini
# Production API endpoint pointing to Render Backend instance
VITE_API_BASE_URL=https://gym-management-saas.onrender.com
```

---

## 📦 Installation & Local Setup

### 1. Prerequisites
* Node.js v18+
* MongoDB Local Instance or MongoDB Atlas Account

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Build TypeScript compiler output
npm run build

# Launch developer environment
npm run dev
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Run dev server
npm run dev

# Compile production bundle
npm run build
```

---

## 🚀 Deployment Guide

### Backend (Render / Heroku)
1. Link your GitHub repository.
2. Set Build Command to `npm install && npm run build` (or `tsc` inside the directory).
3. Set Start Command to `npm start` (which executes `node dist/index.js`).
4. Configure all environment variables listed above in the Dashboard settings.

### Frontend (Vercel / Netlify)
1. Link your repository and set Root Directory to `frontend`.
2. Framework Preset: **Vite**.
3. Set Build Command to `npm run build`.
4. Set Output Directory to `dist`.
5. Set `VITE_API_BASE_URL` in env settings.

---

## 🔒 Security Telemetry & Audit Notes

GymLedger enforces strict security policies to protect tenant and client data:
* **No Staged Secrets**: All production connection strings, database credentials, and security keys are loaded strictly from environment variables.
* **Rate Limiting**: Integrated `express-rate-limit` prevents brute-force login attempts and DDoS runs.
* **Headers Hardening**: `helmet` headers middleware is enabled globally to block cross-site scripting (XSS) and clickjacking attacks.
* **CORS Policies**: Explicit cross-origin resource sharing configured to allow secure handshakes.
* **Data Sanitization**: Backend requests are verified using strict Zod models before database writes occur.

---

## 📄 License
This project is licensed under the MIT License.

---

## 👥 Authors
* **Dipesh Jangir** - *Lead Engineer / SaaS Administrator* - [dipeshjangir12@gmail.com](mailto:dipeshjangir12@gmail.com)
