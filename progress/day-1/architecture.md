# Architecture Document

## Project

Pravartee CRM, Sales Reporting, Tender Intelligence & AI Automation Platform

**Version:** 1.0
**Prepared By:** Shubham Rawat, Technology Officer
**Date:** 03 June 2026

---

# 1. Purpose

This document defines the high-level architecture of the Pravartee CRM platform and its supporting modules.

The objective of the platform is to provide a centralized system for:

* Lead Management
* Sales Pipeline Tracking
* Follow-up Management
* Sales Reporting
* Government Tender Monitoring
* AI-Assisted Business Automation

---

# 2. Business Architecture

```text
┌─────────────────┐
│   Salesperson   │
└────────┬────────┘
         │
         │ Create / Update Leads
         ▼
┌─────────────────────────────┐
│     CRM & Lead Tracker      │
│       Web Application       │
└────────┬──────────┬─────────┘
         │          │
         │          │
         ▼          ▼
┌────────────────┐ ┌────────────────┐
│ Lead Pipeline  │ │ Activity Log   │
│ Management     │ │ & Follow-ups   │
└───────┬────────┘ └────────┬───────┘
        │                   │
        └─────────┬─────────┘
                  ▼
       ┌─────────────────────┐
       │   CEO Dashboard     │
       │                     │
       │ • Pipeline Value    │
       │ • Lead Status       │
       │ • Stale Leads       │
       │ • Team Activity     │
       └─────────────────────┘
```

---

# 3. System Architecture

```text
                         Internet
                             │
                             ▼
                    crm.pravarteesales.com
                             │
                             ▼
                    ┌─────────────────┐
                    │      Nginx      │
                    │ Reverse Proxy   │
                    └────────┬────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Django Application  │
                  │    CRM Backend      │
                  └───────┬─────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ PostgreSQL   │ │ Redis Cache  │ │ File Storage │
│ Database     │ │ & Queue      │ │ Media Upload │
└──────┬───────┘ └──────┬───────┘ └──────────────┘
       │                │
       │                ▼
       │      ┌─────────────────┐
       │      │ Celery Workers  │
       │      │ Background Jobs │
       │      └───────┬─────────┘
       │              │
       │              ▼
       │      ┌─────────────────┐
       │      │ Scheduled Tasks │
       │      │ Notifications   │
       │      └─────────────────┘
       │
       ▼
┌────────────────────────────┐
│ CRM Data Models            │
│                            │
│ • Users                    │
│ • Leads                    │
│ • Stages                   │
│ • Categories               │
│ • Activities               │
└────────────────────────────┘
```

---

# 4. Technology Stack

## Backend

* Python 3.12
* Django
* Django REST Framework

## Database

* PostgreSQL

## Background Processing

* Celery
* Redis

## Web Server

* Nginx
* Gunicorn

## Operating System

* Ubuntu 24.04 LTS

## Version Control

* Git
* GitHub

## Future Integrations

* WhatsApp Business API
* OpenAI API
* Anthropic API
* GeM Tender Monitoring

---

# 5. User Roles

## CEO

Permissions:

* View all leads
* View dashboards
* View reports
* Monitor team activity
* View tender opportunities
* Access AI-generated reports

---

## Sales Head

Permissions:

* View team leads
* Reassign leads
* Monitor follow-ups
* Review sales performance

---

## Salesperson

Permissions:

* Create leads
* Update assigned leads
* Add notes
* Manage follow-ups
* View personal pipeline

---

# 6. Module Architecture

## Module 1 – CRM & Lead Tracker

Core Components:

* Lead Management
* Pipeline Tracking
* Follow-up Tracking
* Activity Logging
* Dashboard Reporting

---

## Module 2 – WhatsApp Reporting Bot

Core Components:

* Daily Sales Reporting
* Lead Creation via WhatsApp
* Follow-up Reminders
* CEO Weekly Summary

---

## Module 3 – Government Tender Intelligence

Core Components:

* Tender Monitoring
* Tender Matching
* Tender Assignment
* Deadline Notifications

---

## Module 4 – AI Automation Layer

Core Components:

* Lead Scoring
* Tender Relevance Analysis
* Business Review Reports
* Bid Draft Assistance

---

# 7. Future Full Platform Architecture

```text
                                   Users
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          ▼                          ▼                          ▼
    Salesperson                Sales Head                    CEO
          │                          │                          │
          └───────────────┬──────────┴──────────┬──────────────┘
                          ▼
                 CRM Web Application
                       (Django)
                          │
     ┌────────────────────┼────────────────────┐
     │                    │                    │
     ▼                    ▼                    ▼
 Lead Module       Tender Module       Dashboard Module
     │                    │                    │
     └──────────────┬─────┴─────┬──────────────┘
                    ▼           ▼
              PostgreSQL      Redis
                    │           │
                    └─────┬─────┘
                          ▼
                    Celery Workers
                          │
      ┌───────────────────┼───────────────────┐
      │                   │                   │
      ▼                   ▼                   ▼
 WhatsApp Bot      Tender Scraper      AI Services
 (Meta API)          (GeM)        (OpenAI/Anthropic)
      │                   │                   │
      └───────────────────┴───────────────────┘
                          │
                          ▼
                  Alerts & Automation
```

---

# 8. Deployment Architecture

## Production Environment

Server:

* Hostinger VPS KVM 2
* Ubuntu 24.04 LTS

Services:

* Nginx
* Django
* PostgreSQL
* Redis
* Celery Worker
* Celery Beat

Domain Structure:

```text
obten.com
│
├── www.obten.com
├── crm.obten.com
└── api.obten.com (future)
```

---

# 9. Non-Functional Requirements

## Security

* HTTPS/SSL
* Strong password policy
* Role-based access control
* Audit logging

## Availability

* Daily database backup
* Service monitoring
* Recovery procedures

## Scalability

* Modular architecture
* Independent service deployment
* Future API support

---

# 10. Approval

This architecture serves as the baseline design for the development of the Pravartee CRM platform and its associated automation modules.

Prepared By:

Shubham Rawat
Technology Officer
Pravartee Sales Pvt. Ltd.

