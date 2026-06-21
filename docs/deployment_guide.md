# 🚀 Production Deployment Guide

This guide describes the configuration and release procedures for the **India Gym Management SaaS Platform**. Follow these instructions to launch the multi-tenant database cluster, Express.js backend API, and React.js client interface.

---

## 📁 Environment Variable Templates

### 1. Backend Service Configuration (`backend/.env`)
Create a `.env` file in the `backend/` folder on production with the following keys:
```ini
# Production listening port (Render/Railway binds automatically to PORT)
PORT=5000

# MongoDB Atlas connection string (replace placeholder credentials)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/gym-management-saas?retryWrites=true&w=majority

# Cryptographic token signature key (use a secure random string)
JWT_SECRET=f98a3e7cd28d9a83b27b9c9f7a83d7392aefcd927494a8e26c11cd73a81283ef
```

### 2. Frontend client Configuration (`frontend/.env`)
Create a `.env` file in the `frontend/` folder or configure Vercel Dashboard variables:
```ini
# Destination address of the Express API backend server (Render/Railway live endpoint)
# Note: Do not include a trailing slash
VITE_API_BASE_URL=https://gym-saas-backend.onrender.com
```

---

## ☁️ Platform Setup Instructions

### 1. MongoDB Atlas Setup (Database Cluster)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and register a free account.
2. **Create a Shared Cluster** (e.g., `Cluster0` in the free tier) and select a cloud provider (AWS/GCP/Azure) and region (e.g., Mumbai for Indian audiences).
3. **Database Access User**:
   * Navigate to **Database Access** under Security.
   * Add a new database user with **Read and Write to any database** permissions. Save the username and password securely.
4. **Network Access (IP Whitelist)**:
   * Navigate to **Network Access** under Security.
   * Add a new IP entry. Set access to **`0.0.0.0/0`** (Allow access from anywhere). This is required since hosting servers like Render use dynamic outbound IP addresses.
5. **Get Connection String**:
   * Go to **Database** (clusters overview) and click **Connect**.
   * Choose **Drivers** as the connection method.
   * Copy the connection string (format: `mongodb+srv://...`). Replace `<password>` and database name in the URI, and save it for the backend environment variables configuration.

---

### 2. Render Deployment (Express API Backend)
1. Register/Login to [Render](https://render.com) and link your GitHub account.
2. Click **New +** and select **Web Service**.
3. Select your repository containing the **Gym-Management-SaaS** codebase.
4. Configure the Web Service settings:
   * **Name**: `gym-management-backend` (or similar)
   * **Root Directory**: `backend` *(CRITICAL: Must point to backend folder)*
   * **Runtime**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm start`
   * **Instance Type**: `Free` (or custom tier)
5. **Add Environment Variables**:
   * Expand the **Advanced** section.
   * Click **Add Environment Variable** and enter:
     * `MONGODB_URI`: *[Your Atlas connection string]*
     * `JWT_SECRET`: *[A secure random token]*
     * `PORT`: `5000` (or leave empty to let Render bind dynamic ports)
6. Click **Create Web Service**. Wait for the build and deployment logs to display `[SERVER RUNNING] hardened Express backend listening on port`.

---

### 3. Vercel Deployment (Vite React Frontend)
1. Register/Login to [Vercel](https://vercel.com) and link your GitHub account.
2. Click **Add New** and select **Project**.
3. Import the repository containing the **Gym-Management-SaaS** codebase.
4. Configure the Project settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `frontend` *(CRITICAL: Must point to frontend folder)*
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
5. **Add Environment Variables**:
   * Under **Environment Variables**, add:
     * `VITE_API_BASE_URL`: *[Your Render/Railway Web Service Live URL, e.g. https://gym-saas-backend.onrender.com]*
6. Click **Deploy**. Vercel will install dependencies, compile the Vite app, and deploy the single-page application.
7. *Note*: The frontend includes a `vercel.json` rewrite file that handles routing:
   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "/api/:path*" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
   This ensures client router pathnames resolve correctly to the React bundle on page refreshes.

---

## 🔑 Default Super Admin Credentials & Seeding

The database includes a seeding script that clears collections and populates the platform with demo Super Admin, Gym Owners, Members, Payments, and Attendance records.

### 1. Seeding Execution Process
1. Locate your backend terminal workspace (or Render environment).
2. Install dependencies and compile the backend:
   ```bash
   cd backend
   npm install
   npm run build
   ```
3. Run the database seed command:
   ```bash
   npm run seed
   ```
   *Note: This command runs `ts-node-dev src/utils/seeder.ts`, which connects to your configured `MONGODB_URI` and populates the collections.*

### 2. Default Seeded Credentials
After seeding completes, you can log in immediately using the following accounts:
* **Super Admin (Platform Owner)**:
  * **Email**: `admin@fitsaas.com`
  * **Password**: `admin123`
* **Gym Owner 1 (Marcus Vance - Active Tenant)**:
  * **Email**: `owner@ironforge.com`
  * **Password**: `owner123`
* **Gym Owner 2 (Diana Prince - Expired/Suspended Tenant)**:
  * **Email**: `owner@titan.com`
  * **Password**: `owner123`

---

## 📋 Production Environment Variable Checklist

Before triggering production deployments, double-check that the following values are correctly declared in your host provider dash:

### Backend Variables (Render Dashboard)
- [ ] **`PORT`**: Hardened Express port (default `5000`).
- [ ] **`MONGODB_URI`**: Production MongoDB Atlas connection string. Make sure user credentials are correct and IP access is whitelisted.
- [ ] **`JWT_SECRET`**: Production-strength cryptographic secret. Do not use local defaults in production.
- [ ] **`NODE_ENV`**: Set to `production` to suppress debug logs and enforce production security constraints.

### Frontend Variables (Vercel Dashboard)
- [ ] **`VITE_API_BASE_URL`**: Live Render backend URL (e.g., `https://gym-saas-backend.onrender.com`). Verify that there is no trailing slash and that it starts with `https://`.

---

## 🔎 Post-Deployment Verification Checklist

Once the services are deployed, perform the following validation tests:

### 1. System Health Checks
- [ ] Navigate to `https://your-backend-url.onrender.com/api/health` and verify the output is `{ "status": "healthy" }`.
- [ ] Navigate to `https://your-backend-url.onrender.com/api/health/db` and verify the state is `connected` and status is `healthy`.
- [ ] Navigate to `https://your-backend-url.onrender.com/api/docs` and verify the Swagger UI loads successfully and reads the local API specification.

### 2. Super Admin Portal Verification
- [ ] Access the frontend URL and log in using the Super Admin credentials (`admin@fitsaas.com` / `admin123`).
- [ ] Verify that the dashboard metrics (Revenues, Active Subscriptions, CRM leads pipeline) display correctly.
- [ ] Verify that the Audit Logs page loads chronologically and displays the "Initial Platform Seed Completed" action.

### 3. Gym Owner Portal & Tenant Isolation Verification
- [ ] Log out of Super Admin and log in as Gym Owner 1 (`owner@ironforge.com` / `owner123`).
- [ ] Navigate to Gym Owner dashboard and verify you can view members, active trainers, and outstanding dues.
- [ ] Log out and log in as Gym Owner 2 (`owner@titan.com` / `owner123`).
- [ ] Confirm you are blocked from accessing the console by the subscription suspension screen and prompted to contact the Super Admin on WhatsApp.

### 4. Interactive Tools Verification
- [ ] Go to Member Management as Gym Owner 1, select a member, and verify you can download their **PDF Pass Card**.
- [ ] Navigate to Payments Tracker, create a dummy payment, and download the **PDF Receipt**.
- [ ] Go to daily check-ins, click **Export to Excel**, and verify the resulting `.xlsx` download contains the log spreadsheet.
- [ ] Open the QR Attendance Scanner, activate the camera option, and check that the camera feed initiates successfully.

---

## 💾 Backup and Restore Procedure

### 1. Automated Backups via MongoDB Atlas
By default, MongoDB Atlas provides continuous cloud backup scheduling:
1. Log in to the [MongoDB Atlas Dashboard](https://cloud.mongodb.com).
2. Go to **Database** and click on your cluster name.
3. Select the **Backup** tab.
4. Configure your backup policy (e.g., daily snapshots, hourly logs, retention periods).
5. Restore from a backup by clicking **Restore** next to a snapshot and selecting to restore to a new cluster or overwrite your active cluster.

### 2. Manual Backup (Database Dump)
To perform a manual backup from your local terminal, use `mongodump` (requires MongoDB Database Tools installed):
```bash
mongodump --uri="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/gym-management-saas" --out="./backup-dumps/backup-$(date +%F)"
```
This generates a directory containing binary BSON database dumps.

### 3. Manual Restore (Database Restore)
To restore a manual backup dump to your Atlas cluster, use `mongorestore`:
```bash
mongorestore --uri="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/gym-management-saas" --drop "./backup-dumps/backup-YYYY-MM-DD/gym-management-saas"
```
*WARNING: The `--drop` flag will drop existing collections before importing the backup data. Use with caution in production.*
