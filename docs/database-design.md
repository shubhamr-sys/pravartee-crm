# Database Design Document

## Project

Pravartee CRM, Sales Reporting, Tender Intelligence & AI Automation Platform

**Version:** 1.0
**Prepared By:** Shubham Rawat
**Designation:** Technology Officer
**Date:** 03 June 2026

---

# 1. Purpose

This document defines the database structure for Module 1 (CRM & Lead Tracker).

The design aims to provide:

* Centralized lead management
* Activity tracking
* Follow-up monitoring
* Dashboard reporting
* Future integration support

The database is designed using PostgreSQL and follows normalization principles to reduce redundancy and improve maintainability.

---

# 2. Entity Relationship Diagram (ERD)

```text
┌───────────────┐
│     User      │
└───────┬───────┘
        │ 1:N
        │
        ▼
┌───────────────┐
│     Lead      │
└───┬─────┬─────┘
    │     │
    │     │
    ▼     ▼
 Stage  ProductCategory
    │
    ▼
LeadActivity
```

---

# 3. Database Tables

## users

Stores application users and role information.

| Column     | Type         | Description                  |
| ---------- | ------------ | ---------------------------- |
| id         | UUID         | Primary Key                  |
| username   | VARCHAR(150) | Unique username              |
| email      | VARCHAR(255) | Email address                |
| first_name | VARCHAR(100) | First name                   |
| last_name  | VARCHAR(100) | Last name                    |
| role       | VARCHAR(50)  | CEO, Sales Head, Salesperson |
| is_active  | BOOLEAN      | User status                  |
| created_at | TIMESTAMP    | Record creation date         |
| updated_at | TIMESTAMP    | Last update date             |

---

## product_categories

Stores supported product categories.

| Column      | Type         | Description      |
| ----------- | ------------ | ---------------- |
| id          | UUID         | Primary Key      |
| name        | VARCHAR(100) | Category name    |
| description | TEXT         | Category details |
| created_at  | TIMESTAMP    | Creation date    |

### Initial Categories

* PC
* Laptop
* Printer
* Networking
* Data Centre
* Audio Visual
* CCTV
* UPS
* Server
* Storage
* Other

---

## lead_stages

Stores sales pipeline stages.

| Column     | Type         | Description   |
| ---------- | ------------ | ------------- |
| id         | UUID         | Primary Key   |
| name       | VARCHAR(100) | Stage name    |
| sequence   | INTEGER      | Display order |
| created_at | TIMESTAMP    | Creation date |

### Initial Stages

| Sequence | Stage       |
| -------- | ----------- |
| 1        | New         |
| 2        | Contacted   |
| 3        | Qualified   |
| 4        | Quoted      |
| 5        | Negotiation |
| 6        | Won         |
| 7        | Lost        |

---

## leads

Stores all customer opportunities.

| Column             | Type          | Description              |
| ------------------ | ------------- | ------------------------ |
| id                 | UUID          | Primary Key              |
| customer_name      | VARCHAR(255)  | Project name             |
| company_name       | VARCHAR(255)  | Company name             |
| contact_person     | VARCHAR(255)  | Contact person           |
| phone              | VARCHAR(20)   | Mobile number            |
| email              | VARCHAR(255)  | Email address            |
| estimated_value    | DECIMAL(15,2) | Opportunity value        |
| lead_source        | VARCHAR(100)  | Source of lead           |
| next_followup_date | DATE          | Next scheduled follow-up |
| notes              | TEXT          | General notes            |
| assigned_to        | UUID          | FK → users               |
| category_id        | UUID          | FK → product_categories  |
| stage_id           | UUID          | FK → lead_stages         |
| is_active          | BOOLEAN       | Lead status              |
| created_at         | TIMESTAMP     | Creation date            |
| updated_at         | TIMESTAMP     | Last update date         |

---

## lead_activities

Stores complete audit history for leads.

| Column        | Type         | Description        |
| ------------- | ------------ | ------------------ |
| id            | UUID         | Primary Key        |
| lead_id       | UUID         | FK → leads         |
| user_id       | UUID         | FK → users         |
| activity_type | VARCHAR(100) | Action type        |
| old_value     | TEXT         | Previous value     |
| new_value     | TEXT         | New value          |
| comments      | TEXT         | Additional notes   |
| created_at    | TIMESTAMP    | Activity timestamp |

### Activity Types

* Lead Created
* Lead Updated
* Stage Changed
* Follow-up Updated
* Note Added
* Lead Assigned
* Lead Closed Won
* Lead Closed Lost

---

# 4. Relationships

## User → Lead

Relationship:

```text
One User
     │
     └─── Many Leads
```

A salesperson may own multiple leads.

---

## Lead → Product Category

Relationship:

```text
One Category
     │
     └─── Many Leads
```

Each lead belongs to one category.

---

## Lead → Stage

Relationship:

```text
One Stage
     │
     └─── Many Leads
```

Each lead can only be in one stage at a time.

---

## Lead → Activity

Relationship:

```text
One Lead
     │
     └─── Many Activities
```

Every update generates an activity record.

---

# 5. Indexing Strategy

To improve performance, indexes shall be created on:

```sql
users.email
users.role

leads.assigned_to
leads.stage_id
leads.category_id
leads.next_followup_date

lead_activities.lead_id
lead_activities.created_at
```

---

# 6. Audit Trail Design

The system shall maintain a complete history of:

* Lead creation
* Lead modification
* Stage movement
* Assignment changes
* Follow-up updates

Records shall never be deleted physically unless approved by system administrators.

Soft deletion shall be preferred.

---

# 7. Future Database Expansion

The schema is designed to support future modules.

## Module 2

Additional tables:

* whatsapp_messages
* notification_logs

---

## Module 3

Additional tables:

* tenders
* tender_assignments
* tender_notifications

---

## Module 4

Additional tables:

* ai_scores
* ai_reports
* bid_drafts

---

# 8. Database Standards

* UUID primary keys
* UTC timestamps
* Foreign key constraints
* Soft deletion strategy
* PostgreSQL as primary database engine

---

# Approval

This database design serves as the baseline schema for Phase 1 CRM development.

Prepared By:

Shubham Rawat
Technology Officer
Pravartee Sales Pvt. Ltd.

