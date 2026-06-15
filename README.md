# Nexus - Multi-Tenant Enterprise Project Management Platform

Nexus is a modern, enterprise-grade, multi-tenant project management and collaboration platform built with **Next.js**, **TypeScript**, **Prisma ORM**, **PostgreSQL**, **Tailwind CSS**, and **DaisyUI**.

The platform provides secure organization isolation, context-aware role-based access control, project management, task tracking, real-time collaboration, invitation-based onboarding, and hierarchical task management.

---

# 🚀 Core Features

## Multi-Tenant Architecture

* Organization-based tenant isolation
* Workspace and project hierarchy
* Secure data boundaries between organizations
* Invitation-based onboarding
* Membership-scoped access control

## Role-Based Access Control (RBAC)

### Owner

* Create organizations
* Manage all workspaces
* Manage all projects
* Invite and remove users
* Assign roles
* Access audit logs
* Global system visibility

### Admin

* Manage workspace members
* Create and manage projects
* Invite employees and guests
* Manage workflows
* Moderate communication channels

### Employee

* Create tasks
* Manage assigned projects
* Participate in chats
* Collaborate through comments
* Track task progress

### Guest

* Restricted project access
* View assigned tasks
* Comment on tasks
* Upload files
* Cannot modify project structure

---

# 🏗 System Architecture

## High-Level Hierarchy

```text
Organization
│
├── Memberships
│
├── Workspaces
│     │
│     └── Projects
│             │
│             ├── Members
│             ├── Tasks
│             ├── Comments
│             ├── Activities
│             └── Conversations
│
└── Invitations
```

---

# 🔐 Authentication & Onboarding

## Organization Creation Flow

```text
User Sign Up
      ↓
Create Organization
      ↓
Create Workspace
      ↓
Assign OWNER Role
      ↓
Redirect Dashboard
```

---

## Invitation Lifecycle

### Step 1 - Invitation Creation

An Owner or Admin creates an invitation.

Required Information:

* Email Address
* Role
* Organization
* Workspace
* Project (optional)

---

### Step 2 - Token Generation

The system generates:

```text
Secure UUID Token
```

Example:

```text
https://nexus.com/invite/8f4f5e6c-2f45-45cd-a12f-8c31de9b3d21
```

Invitation records include:

```text
Email
Role
Organization
Workspace
Project
Token
Expiration Date
Status
```

---

### Step 3 - Invitation Delivery

Development:

```text
Display invite URL in terminal
```

Production:

```text
Send email using:

- Resend
- SendGrid
- SMTP
```

---

### Step 4 - Invitation Acceptance

User opens:

```text
/invite/[token]
```

System validates:

* Token exists
* Token is active
* Token is not expired
* Token has not been used

User provides:

```text
Name
Password
```

System:

```text
Create User
Create Membership
Mark Invite Accepted
Create Session
Redirect Dashboard
```

---

# 🗄 Database Architecture

## Core Models

### User

Represents a system user.

```text
User
 ├─ Memberships
 ├─ Tasks Created
 ├─ Assignments
 ├─ Messages
 └─ Comments
```

---

### Organization

Tenant boundary.

```text
Organization
 ├─ Members
 ├─ Projects
 ├─ Join Links
 └─ Invitations
```

---

### Membership

Unified RBAC table.

```text
Membership
 ├─ User
 ├─ Organization
 ├─ Workspace
 ├─ Project
 └─ Role
```

Roles:

```text
OWNER
ADMIN
EMPLOYEE
GUEST
```

---

### Project

Contains project data.

```text
Project
 ├─ Tasks
 ├─ Members
 ├─ Activity Feed
 └─ Settings
```

---

### Task

Supports hierarchical relationships.

```text
Task
 ├─ Parent Task
 ├─ Subtasks
 ├─ Comments
 ├─ Activity
 └─ Assignees
```

---

# 📋 Task Management Engine

## Features

* Kanban Boards
* List Views
* Subtasks
* Task Dependencies
* Assignments
* Priorities
* Due Dates
* Activity Tracking

---

## Task Lifecycle

```text
TODO
   ↓
IN_PROGRESS
   ↓
REVIEW
   ↓
DONE
```

---

## Task Hierarchy

```text
Project Setup
│
├── Database Design
│     ├── Create Schema
│     └── Generate Client
│
└── Frontend
      ├── Dashboard
      └── Kanban Board
```

---

# 💬 Communication Engine

## Direct Messaging

Supports:

* 1-to-1 Chat
* Group Chat
* File Attachments

---

## Task Comments

Users can:

* Comment on tasks
* Mention teammates
* Upload attachments

---

# 📊 Dashboard System

## Home Dashboard

Displays:

* Assigned Tasks
* Completed Tasks
* Overdue Tasks
* Active Projects
* Recent Activity
* Upcoming Deadlines

---

## Project Dashboard

Displays:

* Progress
* Tasks
* Members
* Activity Feed
* Milestones

---

## My Tasks

Displays:

* Assigned Tasks
* Due Today
* Overdue
* Completed

---

# 🔍 Directory Search Permissions

## Owner / Admin / Employee

Can search:

```text
Organization Directory
Workspace Members
Project Members
```

---

## Guest

Restricted to:

```text
Project Members Only
```

No access to:

```text
Organization Directory
Workspace Members
```

---

# 🛠 Technology Stack

## Frontend

* Next.js 15+
* React
* TypeScript
* Tailwind CSS
* DaisyUI

## Backend

* Next.js Server Actions
* Route Handlers
* Prisma ORM

## Database

* PostgreSQL

## Authentication

* JWT Sessions
* bcrypt-ts

## UI Components

* DaisyUI
* Lucide Icons

---

# 📂 Project Structure

```text
app/
│
├── dashboard/
│   ├── members/
│   ├── messages/
│   ├── notifications/
│   ├── projects/
│   ├── tasks/
│   └── settings/
│
├── invite/[token]/
├── join/[token]/
├── signin/
├── signup/
│
├── layout.tsx
└── page.tsx

lib/
│
├── auth.ts
├── db.ts
├── logger.ts
└── rbac.ts

prisma/
│
└── schema.prisma
```

---

# ⚙ Installation

## Clone Repository

```bash
git clone https://github.com/your-username/nexus.git

cd nexus
```

---

## Install Dependencies

```bash
npm install
```

---

## Configure Environment

Create:

```text
.env
```

Example:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nexus"
JWT_SECRET="your-secret-key"
```

---

## Generate Prisma Client

```bash
npx prisma generate
```

---

## Push Schema

```bash
npx prisma db push
```

---

## Start Development Server

```bash
npm run dev
```

Application runs at:

```text
http://localhost:3000
```

---

# 🔒 Security Features

* Password hashing using bcrypt-ts
* Invitation token validation
* One-time invitation links
* Expiring invitations
* Tenant isolation
* Role-based access control
* Secure session handling
* Route-level authorization
* Server-side permission checks

---
