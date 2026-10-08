# NEXUS — Payroll, without the paperwork.

> **NEXUS** is a production-grade Indian Payroll SaaS platform tailored for small and mid-sized enterprises (SMEs). Built with modern full-stack web technologies, NEXUS automates the entire payroll lifecycle—from employee onboarding, salary structuring, daily attendance and leave tracking, through to pro-rata Loss of Pay (LOP) calculations, statutory deductions (EPF, ESI, Professional Tax, TDS), multi-stage approval workflows, irreversible payroll locking, and cryptographically verified PDF payslip generation.

---

## 🚀 Key Features & Capabilities

### 1. End-to-End Payroll Lifecycle
- **Employee Onboarding & Profiles:** Complete employee profile management with personal, employment, banking (IFSC, Account Number), and statutory identification numbers (PAN, Aadhaar, UAN, ESI).
- **Salary Structuring:** Configurable templates and itemized allowances/deductions (Basic, HRA, DA, Special Allowance, PF, ESI, PT). Automatic Cost-to-Company (CTC) vs. Net In-Hand computation.
- **Attendance & Timesheets:** Daily roster marking (Present, Absent, Half Day, LOP) with punch remarks, monthly summaries, and bulk Excel (`.xlsx` / `.xls`) biometric import parser.
- **Leave Management:** Annual quota tracking (Casual, Sick, Paid Leave), employee self-service leave requests, HR approval/rejection workflows with mandatory audit reasons, and automatic conversion of unapproved or excess leave into Loss of Pay (LOP).
- **Automated Payroll Engine:** Pure modular math engine for exact pro-rata daily wages, LOP deductions, statutory EPF (12% capped at ₹1,800/mo), ESI (0.75% employee / 3.25% employer under ₹21,000 threshold), State-wise Professional Tax slabs, and Old/New Regime TDS.
- **Approval & Immutability Governance:** Strict separation of duties—HR prepares and previews drafts; only Admins can grant final approval and permanently lock cycles. Once locked, records become immutable and tamper-proof.
- **Official PDF Payslips:** High-fidelity, branded PDF payslip generator (`pdfkit`) with earnings and deductions grids, attendance statistics, company credentials, and download endpoints.
- **Employee Self-Service Portal:** Dedicated employee dashboard displaying take-home pay, downloadable payslip history, attendance logs, leave balances, upcoming holidays, and uploaded KYC documents.
- **Audit Reports & Exports:** Downloadable Payroll Summaries, Itemized Salary Registers, and Department Costing reports in CSV, Excel, and PDF formats.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Lucide Icons, Axios |
| **Backend** | Node.js, Express 5, TypeScript, Prisma ORM, PDFKit, xlsx, Zod, bcrypt, JWT |
| **Database** | PostgreSQL (PGlite embedded socket on port `5432` with persistent disk storage) |
| **Design System** | Dark Navy navigation (`#020617` / `#0b1120`), Cyan-to-Blue action gradients, clean white cards |
| **Testing** | Jest, Supertest, ts-jest (100% passing across unit, auth, and E2E lifecycle suites) |

---

## 👥 Role-Based Access Control (RBAC)

NEXUS enforces server-side role validation on every API endpoint:

| Role | Permissions |
|---|---|
| **ADMIN** | Full enterprise authority: Company settings, Masters (Depts, Designations, Locations, Holidays), Salary structures, Statutory configurations, Attendance, Leaves, Payroll Preview/Run/Approve/Lock, Reports, and all Payslips. |
| **HR / PAYROLL ADMIN** | Operational authority: Employee records, daily attendance marking, Excel attendance imports, leave approvals/rejections, draft payroll preparation & preview. **Cannot** give final approval or lock payroll. |
| **EMPLOYEE** | Read-only self-service: Own profile, salary breakup, attendance logs, leave balances, leave applications, KYC documents, and historical payslip PDF downloads. Strictly forbidden from viewing other employees or admin functions. |

---

## 🔐 Demo Credentials

Use these pre-seeded accounts for immediate evaluation:

| Role | Email Identifier | Employee ID | Password | Access Level |
|---|---|---|---|---|
| **Admin** | `admin@nexuspayroll.com` | — | `Admin@12345` | Complete platform control |
| **HR Admin** | `hr@nexuspayroll.com` | — | `Hr@12345` | Operations & Payroll Preparation |
| **Employee 1** | `rahul.sharma@nexuspayroll.com` | `EMP001` | `Emp@12345` | Staff Portal (Engineering) |
| **Employee 2** | `priya.patel@nexuspayroll.com` | `EMP002` | `Emp@12345` | Staff Portal (Product) |
| **Employee 3** | `amit.kumar@nexuspayroll.com` | `EMP003` | `Emp@12345` | Staff Portal (Operations) |

*Note: The login screen supports entering either email or Employee ID (e.g. `EMP001`).*

---

## ⚙️ Quick Start & Installation

### Prerequisites
- Node.js (v18 or higher; tested on Node v25)
- npm (v9 or higher)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/payroll-nexus.git
cd payroll-nexus

# Install root, backend, and frontend dependencies
npm install
```

### 2. Environment Configuration
The `.env` file in the root is pre-configured for instant zero-config startup:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nexus_payroll?schema=public&pgbouncer=true"
JWT_SECRET="nexus_super_secret_jwt_key_payroll_2026_enterprise"
JWT_EXPIRES_IN="7d"
UPLOAD_DIR="./uploads"
```

### 3. Database Initialization & Seed
```bash
# Start embedded PostgreSQL database (listens on 127.0.0.1:5432)
npm run db:start

# In another terminal: Push schema and seed initial data
npm run prisma:push
npm run prisma:seed
```

### 4. Running the Development Servers
```bash
# Run both backend and frontend concurrently
npm run dev

# Or run separately:
npm run dev:backend   # Express API server at http://localhost:5000
npm run dev:frontend  # Vite React App at http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser to access the NEXUS web interface.

---

## 🧪 Automated Test Suite

NEXUS comes with comprehensive automated tests covering the calculation engine, auth/RBAC guards, and the complete 10-step payroll lifecycle:

```bash
npm test
```

### Test Coverage Highlights:
- **`src/modules/payroll/payroll-engine.test.ts` (11 tests)**:
  - Zero LOP vs exact pro-rata daily wage deductions.
  - EPF statutory calculations (12% with statutory ceiling cap of ₹1,800).
  - ESI threshold tests (0.75% for Gross ≤ ₹21,000; ₹0 above ceiling).
  - State-specific Professional Tax schedules (Telangana/Karnataka slabs).
- **`src/modules/auth/auth.test.ts` (6 tests)**:
  - 401 Unauthorized token enforcement.
  - Admin, HR, and Employee authentication via email or Employee ID.
  - Role-based route guard enforcement (403 Forbidden).
  - HR lock restriction tests.
- **`src/modules/payroll/payroll-lifecycle.test.ts` (10 tests)**:
  - 10-step end-to-end integration: HR marks attendance with LOP $\rightarrow$ HR previews draft $\rightarrow$ HR runs payroll $\rightarrow$ HR cannot approve $\rightarrow$ Admin approves $\rightarrow$ Admin locks $\rightarrow$ Immutability verified $\rightarrow$ Employee retrieves payslip $\rightarrow$ Employee downloads binary PDF $\rightarrow$ Reports updated.

---

## 🏛️ System Architecture & API Endpoints

```
/api/v1/
├── /auth/
│   ├── POST /login               # Email or Employee ID authentication
│   ├── GET  /me                  # Current session user details
│   └── POST /reset-password      # Password reset
├── /company/                     # Organization profile & statutory tax IDs
├── /departments/                 # Department master CRUD
├── /designations/                # Designation master CRUD
├── /locations/                   # Location & branch master CRUD
├── /leave-types/                 # Annual leave policy configuration
├── /salary-components/           # Earning & deduction components catalog
├── /statutory/                   # PF, ESI, PT, and TDS regulatory schedules
├── /holidays/                    # Annual holiday calendar
├── /employees/                   # Employee management, KYC upload & download
├── /salary/
│   ├── GET  /templates           # Salary structure templates
│   ├── POST /assign              # Assign salary structure to employee
│   └── GET  /my-salary           # Employee self-service compensation view
├── /attendance/
│   ├── POST /mark                # Daily roster marking
│   ├── GET  /summary             # Monthly attendance & LOP summary
│   ├── POST /import              # Bulk biometric Excel import
│   └── GET  /my-attendance       # Employee self-service attendance log
├── /leaves/
│   ├── GET  /                    # Filtered leave applications queue
│   ├── POST /apply               # Apply for leave (self or on behalf)
│   ├── PUT  /:id/status          # Approve or reject request with reason
│   └── GET  /my-balances         # Employee self-service leave quotas
├── /payroll/
│   ├── GET  /preview             # Calculate and preview cycle
│   ├── POST /run                 # Generate draft payroll run
│   ├── GET  /runs/:year/:month   # Get cycle breakdown
│   ├── PUT  /runs/:id/approve    # Admin approval
│   └── PUT  /runs/:id/lock       # Admin permanent lock & payslip creation
├── /payslips/
│   ├── GET  /                    # List employee payslips
│   ├── GET  /:id                 # Payslip details
│   └── GET  /:id/pdf             # Stream official PDF payslip
└── /reports/
    ├── GET  /dashboard/admin     # Admin / HR KPI statistics
    ├── GET  /dashboard/employee  # Employee dashboard data
    ├── GET  /payroll-summary     # Annual summary (CSV, Excel, PDF)
    ├── GET  /salary-register     # Monthly line-item register (CSV, Excel, PDF)
    └── GET  /department-cost     # Department payroll cost (CSV, Excel)
```

---

## 📄 License & Legal Notice
Copyright © 2026 NEXUS Technologies. All rights reserved.  
*NEXUS — Payroll, without the paperwork.*
