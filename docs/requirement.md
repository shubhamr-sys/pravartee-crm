# Requirements Specification

## Project Information

**Project Name:** Pravartee CRM
**Version:** 1.0
**Prepared By:** Shubham Rawat
**Designation:** Technology Officer
**Date:** 03 June 2026

---

# Project Objective

Develop a centralized Customer Relationship Management (CRM) platform for Pravartee Sales Pvt. Ltd. to manage leads, track sales activities, improve follow-up management, and provide management visibility into the sales pipeline.

The platform will serve as the foundation for future modules including WhatsApp automation, Government Tender Intelligence, and AI-powered business automation.

---

# Business Problems

Current challenges include:

* Lead information maintained through verbal communication.
* Lack of centralized lead tracking.
* Missed follow-ups and sales opportunities.
* Limited visibility into sales team activities.
* No structured reporting mechanism.
* Difficulty measuring sales performance.

---

# Phase 1 Scope (CRM & Lead Tracker)

## User Management

The system shall support the following user roles:

### CEO

* View all leads
* View reports and dashboards
* Access system-wide analytics

### Sales Head

* View team leads
* Assign and reassign leads
* Monitor sales activities

### Salesperson

* Create leads
* Update assigned leads
* Manage follow-ups
* View personal pipeline

---

# Lead Management Requirements

The system shall allow users to:

* Create leads
* Update leads
* View lead history
* Track lead status
* Add notes and follow-up information
* Search leads
* Filter leads

---

# Lead Data Fields

## Customer Information

* Project Name
* Company Name
* Contact Person
* Mobile Number
* Email Address

## Opportunity Information

* Product Category
* Estimated Opportunity Value
* Lead Source
* Assigned Salesperson
* Current Sales Stage

## Activity Information

* Follow-up Date
* Notes
* Created Date
* Updated Date

---

# Sales Pipeline Stages

The CRM shall support the following pipeline stages:

1. New
2. Contacted
3. Qualified
4. Quoted
5. Negotiation
6. Won
7. Lost

---

# Product Categories

Initial categories:

* PC
* Laptop
* Printer
* Networking
* Data Centre
* Audio Visual (AV)
* CCTV
* UPS
* Server
* Storage
* Other

---

# Lead Sources

Supported lead sources:

* Website
* Referral
* Tender
* WhatsApp
* Email
* Cold Call
* Existing Customer
* Walk-In
* Other

---

# Dashboard Requirements

The CEO dashboard shall display:

* Total pipeline value
* Lead count by stage
* Monthly bookings
* Won opportunities
* Lost opportunities
* Top opportunities by value
* Stale leads
* Recent activities

---

# Activity Tracking Requirements

The system shall automatically record:

* Lead creation
* Lead updates
* Stage changes
* Follow-up modifications
* User actions

Each activity must contain:

* User
* Timestamp
* Action type
* Related lead

---

# Stale Lead Detection

A lead shall be considered stale when:

* No update has been recorded for 3 days.

The system shall highlight stale leads in dashboard reports.

---

# Non-Functional Requirements

## Security

* HTTPS enabled
* Authentication required
* Role-based access control
* Audit trail for major actions

## Performance

* Responsive web interface
* Optimized database queries
* Support for concurrent users

## Availability

* Daily database backups
* Service monitoring
* Recovery procedures

## Scalability

The architecture shall support future integration with:

* WhatsApp Business API
* Government Tender Monitoring
* AI Automation Services
* Mobile Applications

---

# Future Modules

## Module 2 – WhatsApp Reporting Bot

* Daily reporting
* Follow-up reminders
* CRM updates through WhatsApp

## Module 3 – Tender Intelligence

* Tender discovery
* Automated alerts
* Bid tracking

## Module 4 – AI Automation

* Lead scoring
* Tender relevance scoring
* Monthly reporting
* Bid draft generation

---

# Acceptance Criteria

Phase 1 shall be considered complete when:

* Users can create and update leads.
* Leads can move through pipeline stages.
* Dashboard displays real-time metrics.
* Role-based permissions function correctly.
* Activity history is maintained.
* Stale leads are automatically identified.
* Data persists in PostgreSQL.
* Production deployment is operational.

---

# Approval

This document defines the baseline requirements for Phase 1 development of the Pravartee CRM platform.

**Prepared By**

Shubham Rawat
Technology Officer
Pravartee Sales Pvt. Ltd.


