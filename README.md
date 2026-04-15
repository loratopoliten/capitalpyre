# 🔥 Capital Pyre

<div align="center">

**Where capital ignites.**

*The investor-entrepreneur capital network built for Botswana's next generation of business.*

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://mysql.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## What is Capital Pyre?

Capital Pyre is a full-stack web platform that connects **entrepreneurs**, **SMEs**, and **investors** — bridging the gap between Botswana's ~20,000 SMEs and the institutional capital seeking to fund them.

| Layer | What it does |
|---|---|
| **Matchmaking** | Smart algorithm scores investor-entrepreneur compatibility across 5 dimensions |
| **Capital Readiness Score (CRS)** | 0–100 rating that tells investors exactly how fundable a business is |
| **Deal Room** | Secure document exchange, NDA management, and step-by-step deal stage tracking |
| **Bond Pools** | Pools of vetted SMEs structured into BSE-listed bond instruments |
| **Real-time Messaging** | Socket.IO chat between matched parties, live notifications |

---

## Architecture

```
capitalpyre/
├── backend/           Node.js + Express REST API (MySQL, JWT, Socket.IO)
├── frontend/          React 18 + Vite + Tailwind CSS
├── scoring/           Python 3.12 + FastAPI — Capital Readiness Score engine
├── db/                MySQL schema (17 tables) + seed data
├── nginx/             Reverse proxy (rate limiting, SSL, WebSocket)
└── docker-compose.yml All 6 services orchestrated
```

The backend is adapted from the **IAMS** (Industrial Attachment Management System) — a production-quality Node.js/Express/MySQL codebase. Its auth middleware, matching algorithm, logbook system, notifications, and file upload patterns were directly inherited and extended.

---

## Tech Stack

| Service | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Redux Toolkit, TanStack Query, Socket.IO Client |
| Backend | Node.js 20, Express.js, mysql2, jsonwebtoken, bcryptjs, multer, nodemailer, Socket.IO |
| Scoring | Python 3.12, FastAPI, Uvicorn, Pydantic |
| Database | MySQL 8.0 — 17 tables, InnoDB, performance-indexed |
| Cache / RT | Redis 7 (Socket.IO adapter + session caching) |
| Proxy | Nginx (reverse proxy, rate limiting, SSL, WebSocket upgrade) |
| Auth | JWT — 7-day default, 30-day with Remember Me |
| Container | Docker + Docker Compose |

---

## User Roles

| Role | Capabilities |
|---|---|
| `entrepreneur` | Pitch profile, CRS score, match requests, Deal Room, weekly logbooks |
| `sme` | Business profile, financial document uploads, CRS score, bond pool pipeline |
| `investor` | Browse profiles, send match requests, Deal Room, BSE bond pools, watchlist |
| `admin` | KYC approval, SME approval, bond pool creation, analytics, audit logs |

---

## Quick Start

### With Docker (recommended)

```bash
git clone https://github.com/loratopoliten/capitalpyre.git
cd capitalpyre

cp .env.example .env
cp backend/.env.example backend/.env
# Edit backend/.env — set DB_PASSWORD, JWT_SECRET, SMTP credentials

docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| CRS Scoring | http://localhost:8000 |

Default admin: `admin@capitalpyre.com` / `Admin@1234`
> ⚠️ Change the admin password on first login.

---

### Without Docker (local dev)

**Backend**
```bash
cd backend && npm install
npm run db:init   # creates DB, runs schema + seeds
npm run dev       # :5000
```

**Scoring**
```bash
cd scoring
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend && npm install
npm run dev       # :3000 — proxies /api → :5000
```

---

## Capital Readiness Score (CRS)

Python/FastAPI microservice scoring every business on 5 dimensions:

| Dimension | Max | What it measures |
|---|---|---|
| Financial Health | 25 | Revenue trend, profitability, revenue band |
| Governance | 20 | CIPA registration, tax clearance, compliance |
| Track Record | 20 | Years operating, employee count, traction |
| Documentation | 20 | Completeness of uploaded financial documents |
| Pitch Quality | 15 | Profile completeness, problem/solution/market clarity |
| **Total** | **100** | |

🔴 Low `<40` · 🟡 Medium `40–69` · 🟢 High `≥70`

---

## Matching Algorithm

Adapted from IAMS `computeMatchScore()` — extended from 3 to 5 dimensions:

| Dimension | Weight |
|---|---|
| Sector match | 30 pts |
| Investment stage match | 25 pts |
| Ticket size in range | 20 pts |
| CRS above investor threshold | 15 pts |
| Risk appetite alignment | 10 pts |

Top 5 matches surfaced per entrepreneur/SME.

---

## Remember Me

| Setting | JWT Expiry | Storage |
|---|---|---|
| Remember Me OFF | 7 days | `sessionStorage` — clears on tab close |
| Remember Me ON | 30 days | `localStorage` — persists across restarts |

---

## Database Schema

17 tables — full schema in [`db/migrations/001_schema.sql`](db/migrations/001_schema.sql):

`users` · `entrepreneur_profiles` · `sme_profiles` · `investor_profiles` · `sme_documents` · `matches` · `deals` · `deal_documents` · `logbooks` · `logbook_reviews` · `assessments` · `bond_pools` · `messages` · `notifications` · `watchlist` · `password_reset_tokens` · `audit_logs`

---

## Production Deployment

```bash
certbot certonly --standalone -d yourdomain.com
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   nginx/certs/
echo "NODE_ENV=production" >> backend/.env
docker-compose up -d --build
```

---

## Credits

Backend architecture adapted from **IAMS** (Industrial Attachment Management System) — UB CSI341 Software Engineering.

Platform concept from: UB Investor Portal Group Report + SME Capital Exchange Investor Deck (2026) + IAMS production backend.

---

<div align="center">
<i>Capital Pyre · Botswana · 2026 · 🔥 Where capital ignites</i>
</div>
