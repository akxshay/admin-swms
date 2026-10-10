# Smart Waste Management System (SWMS) & SwachhaAdmin

A unified, real-time smart waste management platform consisting of:
1. **Customer Portal & Core Backend (`./SWMS-prod/SWMS-prod`)**: Doorstep recyclable pickup scheduling, live GPS collector tracking, online payments, eco-points, rewards redemption, and community exchange.
2. **Admin Dashboard (`./`)**: Modern React + Vite control panel for managing pickups, collectors, users, eco-exchange hubs, marketplace listings, rewards catalog, and real-time operations.
3. **Shared PostgreSQL Database**: Single source of truth synchronized between customer actions and admin oversight.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │    Shared PostgreSQL Database (5432)   │
                      └──────────────────┬─────────────────────┘
                                         │ Prisma ORM
                                         ▼
                      ┌────────────────────────────────────────┐
                      │   Express Backend (Port 3000)          │
                      │   - Customer API: /api/*               │
                      │   - Admin API:    /api/admin/*         │
                      │   - In-memory cache + Relational Sync  │
                      └──────────────┬──────────────────┬──────┘
                                     │                  │ Vite Proxy (/api)
                                     ▼                  ▼
     ┌──────────────────────────────────┐            ┌──────────────────────────────────┐
     │  Customer Portal (Port 3000)     │            │  SwachhaAdmin Dashboard (5173)   │
     │  React 19 + TypeScript + Leaflet │            │  React 19 + Vite + Tailwind CSS  │
     └──────────────────────────────────┘            └──────────────────────────────────┘
```

---

## Prerequisites

- **Node.js**: v20 or newer
- **npm**: v10 or newer (on Windows PowerShell, use `npm.cmd` if script execution is restricted)
- **Docker & Docker Compose**: For running the local PostgreSQL container

Verify your installation:
```bash
node -v
npm -v
docker --version
```

---

## Quick Start: Running Everything Together

### Step 0: Clone the Repository & Install Dependencies

```bash
git clone https://github.com/akxshay/admin-swms.git
cd admin-swms

# 1. Install dependencies for the Admin Dashboard (root folder)
npm install

# 2. Navigate to the Customer App & Backend folder and install dependencies
cd SWMS-prod/SWMS-prod
npm install

# 3. Create the environment file from example
cp .env.example .env
# (On Windows PowerShell: copy .env.example .env)
```

---

### Step 1: Start the PostgreSQL Database

In the backend directory (`SWMS-prod/SWMS-prod`), launch the PostgreSQL container:

```bash
docker compose up -d
```
*(On older Docker versions: `docker-compose up -d`)*

Verify the database container is healthy:
```bash
docker compose ps
```

---

### Step 2: Apply Database Migrations & Seed Data

In the same directory (`SWMS-prod/SWMS-prod`), apply Prisma migrations to ensure the relational schema and admin seed accounts are in place:

```bash
npm run prisma:migrate
```
*(Or run `npx prisma migrate deploy`)*

---

### Step 3: Start the Backend & Customer App (Terminal 1)

In `SWMS-prod/SWMS-prod`, start the Express API and Customer Web Server:

```bash
npm run dev
```
*(On Windows PowerShell if needed: `npm.cmd run dev`)*

- **Backend & Customer App URL**: [http://localhost:3000](http://localhost:3000)
- **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)
- **Admin API Base**: [http://localhost:3000/api/admin](http://localhost:3000/api/admin)

---

### Step 4: Start the Admin Dashboard (Terminal 2)

Open a new terminal window in the root project folder (`admin2`) and start the Vite dev server:

```bash
cd d:/admin2
npm run dev
```
*(On Windows PowerShell if needed: `npm.cmd run dev`)*

- **Admin Dashboard URL**: [http://localhost:5173](http://localhost:5173)

---

## Default Access & Credentials

### SwachhaAdmin Dashboard
- **URL**: [http://localhost:5173](http://localhost:5173)
- **Email**: `admin@swms.local`
- **Password**: `admin123`

### Customer Portal
- **URL**: [http://localhost:3000](http://localhost:3000)
- **Login**: Mobile number with OTP authentication (in development mode, test OTPs are pre-configured or logged in terminal).

### PostgreSQL Database
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `swms_db`
- **Username**: `swms_user`
- **Password**: `swms_password`

---

## Directory Structure

```text
admin2/
├── src/                          # SwachhaAdmin Frontend Source
│   ├── components/               # Dashboard, Charts, Activity Tables, Modals
│   ├── pages/                    # Dashboard, Pickups, Collectors, Users, etc.
│   ├── services/                 # adminApi.js (authenticated API client)
│   └── App.jsx                   # Routing, Authentication Gate, Sidebar
├── package.json                  # Admin frontend dependencies (Vite, React 19)
├── vite.config.js                # Vite config with /api proxy to localhost:3000
│
└── SWMS-prod/SWMS-prod/          # Customer App & Express Backend
    ├── prisma/                   # schema.prisma & SQL migrations
    ├── server/                   # Express routes & business logic
    │   ├── admin-routes.ts       # Secure /api/admin/* endpoints
    │   ├── routes.ts             # Customer /api/* endpoints
    │   ├── db.ts                 # Real-time memory state & sync manager
    │   └── postgres-persistence.ts # Prisma relational persistence layer
    ├── src/                      # Customer Portal React UI
    ├── docker-compose.yml        # PostgreSQL 15 configuration
    ├── server.ts                 # Main server entry point
    └── package.json              # Backend dependencies and scripts
```

---

## Running Automated Tests

To verify backend data integrity, admin authentication, rate limiting, and relational database persistence:

```bash
cd SWMS-prod/SWMS-prod
npm test
```

Or run the admin test suites directly:
```bash
npx vitest run tests/admin/group1-data-integrity.test.ts
npx vitest run tests/admin/group2-auth-security.test.ts
```

---

## Troubleshooting

### 1. Database Connection Refused (`localhost:5432`)
Make sure Docker Desktop is running, then restart the container:
```bash
cd SWMS-prod/SWMS-prod
docker compose down
docker compose up -d
```

### 2. Admin App shows Network Error or CORS issues
Verify that the backend is running on `http://localhost:3000`. The Vite development server in `admin2` proxies requests matching `/api` to `http://localhost:3000`. If you access the backend directly from another origin, ensure proper CORS headers are enabled.

### 3. PowerShell Execution Policy Error (`cannot be loaded because running scripts is disabled`)
Use `npm.cmd` instead of `npm`, e.g.:
```powershell
npm.cmd run dev
```

### 4. Admin Session Expired
If your admin session token expires, simply log out and sign back in at [http://localhost:5173](http://localhost:5173) using `admin@swms.local` / `admin123`.
