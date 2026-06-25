# Pravartee CRM

Internal CRM, Sales Reporting, Tender Intelligence, and AI Automation Platform for Pravartee Sales Pvt. Ltd.

## Project Overview

Pravartee CRM is a centralized platform designed to manage leads, track sales activities, monitor government tenders, automate reporting, and provide AI-assisted business insights.

The platform aims to replace manual and verbal sales tracking with a structured, auditable, and scalable system.

---

## Project Modules

### Module 1 – CRM & Lead Tracker

* Lead management
* Pipeline tracking
* Role-based access control
* CEO dashboard
* Activity history
* Follow-up tracking

### Module 2 – WhatsApp Sales Reporting Bot

* Daily sales reporting
* Automated follow-up reminders
* CRM updates via WhatsApp
* Weekly CEO summaries

### Module 3 – Government Tender Intelligence

* GeM tender monitoring
* Tender filtering
* Automated alerts
* Bid tracking

### Module 4 – AI Automation Layer

* Lead scoring
* Tender relevance scoring
* Monthly business reports
* Bid draft assistance

---

## Technology Stack

### Backend

* Python 3.12
* Django
* Django REST Framework

### Database

* PostgreSQL

### Background Processing

* Celery
* Redis

### Infrastructure

* Ubuntu 24.04
* Nginx
* Gunicorn

### AI Services

* OpenAI API
* Anthropic API

---

## Repository Structure

```text
pravartee-crm/
│
├── backend/              # Django 5.x API (see backend/DEVELOPMENT.md)
│   ├── config/           # Project settings & URLs
│   ├── apps/             # accounts, leads, activities, dashboard, core
│   ├── manage.py
│   └── requirements.txt
├── frontend/             # Next.js auth UI (see frontend/README.md)
├── docs/
├── deployment/
├── tests/
├── README.md
└── .gitignore
```

---

## User Roles

### CEO

* Full access
* Dashboard visibility
* Reporting

### Sales Head

* Team management
* Lead assignment
* Reporting

### Salesperson

* Lead management
* Follow-up updates

---

## Development Methodology

* Daily Git commits
* Weekly progress review
* Module-wise sign-off
* Production deployment after acceptance testing

---

## Project Status

Current Phase: Week 2 – Foundation Setup (in progress)

### Quick start (plug-and-play)

```bash
cp .env.example .env    # edit BACKEND_PORT, FRONTEND_PORT, POSTGRES_PASSWORD
chmod +x start.sh stop.sh
./start.sh
```

Open the URL printed by the script (default `http://<your-ip>:3034`).  
Change ports in root `.env` — backend, frontend, and CORS stay in sync automatically.

```bash
./stop.sh          # stop backend
./stop.sh --all    # stop backend + PostgreSQL Docker
```

See [backend/DEVELOPMENT.md](backend/DEVELOPMENT.md) for manual setup.

### LAN / mobile GPS (HTTPS)

Browsers block location on `http://<LAN-IP>`. For attendance punch on phones over Wi‑Fi:

```bash
./start-https.sh
```

Open `https://<your-server-ip>:3034` and accept the self-signed certificate once per device.

See [deployment/lan-https/README.md](deployment/lan-https/README.md).

### Production (Ubuntu + HTTPS)

For production with **Let’s Encrypt SSL** (trusted padlock, no certificate warning):

See [deployment/production/README.md](deployment/production/README.md)

---


## Maintainer


Shubham Rawat

Technology Officer

Pravartee Sales Pvt. Ltd.
