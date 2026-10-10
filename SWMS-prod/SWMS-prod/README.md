# SWMS Clean City Portal

<p align="center">
  <strong>A modern customer portal for doorstep recyclable-waste collection</strong>
</p>

<p align="center">
  Schedule pickups, track collectors on real road routes, pay securely, manage addresses, and earn Eco Points.
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white" />
  <img alt="Express" src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" />
  <img alt="Tests" src="https://img.shields.io/badge/tests-16%20passing-3E8E41" />
</p>

---

## Overview

SWMS (Smart Waste Management System) is a standalone software system for coordinating recyclable-waste collection at a customer’s doorstep.

The portal provides:

- Pickup scheduling with saved addresses, GPS, map selection, and address search.
- Waste-category and bag-size selection with server-side pricing quotes.
- Pay Online and Pay at Doorstep booking modes.
- Razorpay checkout integration with server-side signature verification.
- Collector assignment and live pickup status updates.
- Road-based collector tracking using OSRM and OpenStreetMap geometry.
- Doorstep PIN verification before a pickup is completed.
- Persistent Eco Points, achievements, reward vouchers, and redemption history.
- Address management, notifications, complaints, and community exchange listings.
- Responsive layouts for desktop, tablet, and mobile screens.

## Product flow

```text
Authenticate
    ↓
Complete profile and address setup
    ↓
Schedule recyclable pickup
    ↓
Choose Pay Online or Pay at Doorstep
    ↓
Follow pickup status and collector route
    ↓
Verify doorstep PIN
    ↓
Pickup completed → Eco Points credited
    ↓
Redeem persisted rewards and voucher codes
```

## Technology stack

### Client

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Leaflet
- Lucide React
- Motion
- Canvas Confetti

### Backend

- Node.js
- Express
- TypeScript executed with `tsx`
- Prisma relational persistence backed by PostgreSQL
- Server-Sent Events for notification updates
- Adapter-based integrations for payments, maps, storage, and SMS

### External services

- OSRM / OpenStreetMap for road routing and map tiles.
- Razorpay for online payments when enabled.
- Google Gemini for supported AI features.
- Optional MSG91, Google Maps, Cloudinary, and other providers through environment configuration.

## Requirements

- Node.js 20 or newer is recommended.
- npm 10 or newer is recommended.
- A modern browser with JavaScript enabled.
- Internet access for map tiles, geocoding, and OSRM routing.

Check your local versions:

```bash
node --version
npm --version
```

> On Windows PowerShell, use `npm.cmd` if PowerShell execution policy prevents `npm.ps1` from running.

## Installation

Clone or open the project, then install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
copy .env.example .env.local
```

On macOS or Linux:

```bash
cp .env.example .env.local
```

Set only the credentials required for the providers you intend to use. Never commit `.env.local`, `.env`, API keys, or payment secrets.

## Running locally

### Running the Full System (Customer App + Admin Dashboard)

1. **Start PostgreSQL Database** (via Docker Compose):
   ```bash
   docker compose up -d postgres
   ```
   *(Or `docker-compose up -d postgres`)*

2. **Run Prisma Migrations** (sync schema with PostgreSQL):
   ```bash
   npm run prisma:migrate
   ```

3. **Start the Backend & Customer App** (Terminal 1):
   ```bash
   npm run dev
   ```
   On Windows PowerShell: `npm.cmd run dev`
   - Customer Web App: `http://localhost:3000`
   - Health Check: `http://localhost:3000/health`
   - Admin API Endpoints: `http://localhost:3000/api/admin/*`

4. **Start the SwachhaAdmin Dashboard** (Terminal 2):
   ```bash
   cd ../../
   npm run dev
   ```
   On Windows PowerShell: `npm.cmd run dev`
   - Admin Dashboard: `http://localhost:5173`
   - Default Login: `admin@swms.local` / `admin123`

---

## Docker Compose

The repository currently includes [docker-compose.yml](./docker-compose.yml) for starting a PostgreSQL 15 development database:

```bash
docker compose up -d postgres
```

Check the database container:

```bash
docker compose ps
docker compose logs -f postgres
```

Stop the database:

```bash
docker compose down
```

On older Docker installations, the equivalent command may be:

```bash
docker-compose up -d postgres
```

> Set `DATABASE_URL` and run `npm run prisma:migrate` before starting the server. Runtime reads and writes then use the relational Prisma tables. `data/db.json` is retained only as an import source/fallback for local tests.

The default Compose credentials are development-only:

| Setting | Value |
| --- | --- |
| Host | `localhost` |
| Port | `5432` |
| Database | `swms_db` |
| User | `swms_user` |
| Password | `swms_password` |

Do not use these credentials in production. Change them before exposing PostgreSQL outside a local development environment.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Express server with Vite middleware |
| `npm run build` | Create the production frontend bundle in `dist/` |
| `npm run start` | Start the production server |
| `npm run preview` | Preview the Vite production output |
| `npm run lint` | Run the TypeScript compiler without emitting files |
| `npm test` | Run the Vitest test suite |

Windows PowerShell equivalents use `npm.cmd`, for example:

```powershell
npm.cmd run lint
npm.cmd test
```

## Environment configuration

The complete template is available in [.env.example](./.env.example).

### Core configuration

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port. Defaults to `3000`. |
| `NODE_ENV` | Use `production` to serve the built `dist/` directory. |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma at runtime. |
| `SWMS_DB_FILE` | Optional JSON import/fallback path; not used when PostgreSQL is configured. |
| `APP_URL` | Public application URL used by hosted deployments. |
| `GEMINI_API_KEY` | Gemini API credential for AI-powered features. |

### Provider configuration

| Variable | Values | Purpose |
| --- | --- | --- |
| `PAYMENTS_PROVIDER` | `fake` or `razorpay` | Select payment adapter. |
| `RAZORPAY_KEY_ID` | secret value | Razorpay public key identifier. |
| `RAZORPAY_KEY_SECRET` | secret value | Server-side signature verification secret. |
| `RAZORPAY_WEBHOOK_SECRET` | secret value | Optional webhook verification secret. |
| `MAPS_PROVIDER` | `osm` or `google` | Select map/geocoding provider. |
| `VITE_ROUTING_BASE_URL` | URL | Optional OSRM-compatible routing endpoint. |
| `GOOGLE_MAPS_API_KEY` | secret value | Google Maps credentials when enabled. |
| `SMS_PROVIDER` | `console` or `msg91` | Select OTP delivery adapter. |
| `MSG91_AUTH_KEY` | secret value | MSG91 credential when enabled. |
| `STORAGE_PROVIDER` | `local` or `cloudinary` | Select file/image storage adapter. |
| `CLOUDINARY_URL` | secret value | Cloudinary connection string when enabled. |
| `PAYMENT_MODE` | `PAY_NOW`, `PAY_LATER`, or `BOTH` | Control available booking payment modes. |

The application is configured to work locally with development adapters where appropriate. Production deployments should use real, authenticated providers and production secrets.

## Data persistence

PostgreSQL is the runtime source of truth when `DATABASE_URL` is configured:

```text
prisma/schema.prisma                   Relational schema
prisma/migrations/                     PostgreSQL migrations
server/postgres-persistence.ts         Relational hydrate/transaction persistence
scripts/import-json-to-postgres.ts     Idempotent JSON import (source is never modified)
data/db.json                           Legacy import/fallback data
```

The application persists changes transactionally across relational parent and child tables. If PostgreSQL is not configured, test runs use a separate JSON fallback file.

### Important data guidance

- Do not run a seed or reset operation against a production database.
- Back up `data/db.json` before importing or manually maintaining legacy data.
- Keep `data/db.json` out of source control if it contains real customer information.
- Configure `SWMS_DB_FILE` to place runtime data outside the application directory in production.
- PostgreSQL via Prisma is the runtime persistence path when `DATABASE_URL` is configured; JSON is retained only for import/fallback.

## Architecture

```text
Browser
  ├── React pages and shared UI
  ├── API client with authenticated user header
  ├── Leaflet map and route animation
  └── Server-Sent Events client
          │
          ▼
Express server
  ├── Authentication and customer routes
  ├── Pickup and collector routes
  ├── Payment and webhook routes
  ├── Rewards and redemption routes
  ├── Address, complaint, exchange, and notification routes
  ├── Provider adapters
  └── JSON database manager
          │
          ├── OSRM / OpenStreetMap
          ├── Razorpay
          ├── Gemini
          └── Optional SMS, maps, and storage providers
```

### Important directories

| Path | Responsibility |
| --- | --- |
| `src/pages/` | Application screens and user flows |
| `src/components/` | Shared UI, layout, map, modal, toast, and form components |
| `src/lib/api.ts` | Typed frontend API client |
| `src/lib/routing.ts` | Route calculation, densification, distance, heading, and animation geometry |
| `server/routes.ts` | Express API routes |
| `server/services/` | Pickup, rewards, OTP, pricing, exchange, complaint, and assignment logic |
| `server/adapters/` | Provider integrations and development adapters |
| `server/db.ts` | Database loading and persistence |
| `server/seed-data.ts` | Initial demo records and configuration-like data |
| `tests/` | Service and route-progress tests |
| `public/` | Static assets and icons |

## Route tracking behavior

Live tracking uses actual ordered road geometry:

1. The selected collector origin and pickup destination are sent to OSRM.
2. GeoJSON `[longitude, latitude]` points are converted to Leaflet `[latitude, longitude]` points.
3. The route is densified for smooth animation.
4. The collector position is interpolated along the route by travelled road distance.
5. The displayed polyline is replaced with the remaining route from the current position to the destination.
6. Distance, ETA, heading, and marker position update during animation.

If the public OSRM endpoint is unavailable, the application uses its existing non-straight-line urban-grid fallback so the simulator remains demonstrable. A production deployment should use a reliable, rate-limit-aware routing service.

## Payment integration

The application supports:

- `PAY_LATER`: payment is collected at the doorstep.
- `PAY_NOW`: a Razorpay order is created and checkout is opened.
- Server-side HMAC signature verification using the configured secret.
- Payment failure handling and status persistence.

For production Razorpay usage:

1. Set `PAYMENTS_PROVIDER=razorpay`.
2. Configure `RAZORPAY_KEY_ID`.
3. Configure `RAZORPAY_KEY_SECRET` only on the server.
4. Configure and verify the webhook endpoint using `RAZORPAY_WEBHOOK_SECRET`.
5. Use HTTPS and validate webhook event idempotency before accepting live traffic.

Never expose `RAZORPAY_KEY_SECRET` or webhook secrets to the browser.

## Testing and quality checks

Run the complete validation set:

```bash
npm run lint
npm test
npm run build
```

The test suite currently covers pricing, pickup transitions, payment verification behavior, OTP behavior, reward accounting, and route-progress geometry.

Focused route tests:

```bash
npm test -- --run tests/routing.test.ts
```

Before opening a pull request, verify:

- TypeScript has no errors.
- All tests pass.
- The production build succeeds.
- A pickup can be scheduled.
- The selected payment mode remains visible.
- Collector tracking follows the route geometry.
- Doorstep PIN verification completes only with the server-issued PIN.
- Eco Points and reward redemptions persist after a server restart.
- No secrets or customer data are included in the change.

## Production deployment checklist

### Application

- [ ] Build with `npm run build`.
- [ ] Run with `NODE_ENV=production npm run start`.
- [ ] Set a non-development `NODE_ENV`.
- [ ] Configure a stable `PORT`.
- [ ] Terminate TLS at the platform or reverse proxy.
- [ ] Configure a process supervisor or managed hosting service.

### Security

- [ ] Replace development/fake adapters with authenticated production providers.
- [ ] Store secrets in a managed secret store.
- [ ] Disable or protect destructive development/reset endpoints.
- [ ] Enforce authenticated user identity on every protected route.
- [ ] Configure CORS, rate limits, secure headers, and request logging at the edge.
- [ ] Validate webhook signatures and make payment processing idempotent.
- [ ] Avoid storing unnecessary personal data.
- [ ] Back up and restrict access to the persistence file.

### Operations

- [ ] Configure health checks against `/health`.
- [ ] Monitor API errors, payment failures, route-provider failures, and persistence failures.
- [ ] Use a managed database for multi-instance or high-volume deployments.
- [ ] Use a production routing provider or self-hosted routing service with appropriate quotas.
- [ ] Test backup restoration before launch.

## Troubleshooting

### The app does not start

Confirm dependencies are installed and use the correct Windows command if necessary:

```powershell
npm.cmd install
npm.cmd run dev
```

### Maps or routes do not load

Check browser connectivity to OpenStreetMap tiles and the configured OSRM endpoint. Confirm that pickup coordinates are valid latitude/longitude values.

### Online payment does not open

Confirm:

- `PAYMENTS_PROVIDER=razorpay`.
- Razorpay Checkout is available in the browser.
- The key ID is configured.
- The server can create an order.
- The server secret is configured for signature verification.

### Data appears to disappear after restart

Check:

- The process is using the expected working directory.
- `SWMS_DB_FILE` is not pointing at a different file.
- `data/db.json` is writable.
- The application logs contain no persistence errors.
- A test run is not being pointed at the live database.

### Rewards are not updated

Refresh the Rewards page after a pickup completion and inspect the `/api/rewards` response. Reward balances are derived from the server-side ledger, while redemptions are persisted through `/api/rewards/redeem`.

## Contributing

1. Create a focused branch.
2. Keep changes small and related to one behavior.
3. Follow the existing TypeScript, React, and service-layer patterns.
4. Do not commit `.env` files, credentials, customer data, build output, or local database backups.
5. Run lint, tests, and the production build before submitting a change.
6. Include the user-visible behavior and validation results in the pull request description.

## License and ownership

This repository is an application project. Add the organization’s approved license, privacy policy, data-retention policy, and third-party attribution notices before public or commercial distribution.
