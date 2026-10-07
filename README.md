# StockFlow ERP – Inventory & Sales Management System
### *Enterprise Supply Chain, Procurement & Logistics Platform Inspired by SAP MM & SAP SD*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.0-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![Tests](https://img.shields.io/badge/Tests-8%2F8%20Passed-brightgreen)](https://docs.pytest.org)

---

## 1. Executive Summary

**StockFlow ERP** is an enterprise-grade full-stack web application that faithfully mirrors the industrial architecture and transactional workflows of **SAP ERP Materials Management (MM)** and **Sales & Distribution (SD)**.

Designed to serve as a standout software portfolio showcase, StockFlow ERP implements strict transactional business logic, immutable audit trails, and multi-warehouse governance to eliminate phantom inventory, prevent negative stock states, and coordinate end-to-end supply chain lifecycles.

```
       ┌────────────────────────────────────────────────────────┐
       │              SAP MM (Procurement Flow)                 │
       │                                                        │
       │  Vendor ──► Purchase Requisition (PR) ──► Purchase     │
       │             Order (PO) ──► Goods Receipt (MIGO) ──►    │
       │             Inventory Increment ──► MIRO Invoice       │
       └──────────────────────────┬─────────────────────────────┘
                                  │ Stock Balances & Ledgers
       ┌──────────────────────────▼─────────────────────────────┐
       │             SAP SD (Order-to-Cash Flow)                │
       │                                                        │
       │  Customer ──► Sales Order (VA01) ──► Stock ATP Check   │
       │               ──► Outbound Delivery (VL01N) ──► Post   │
       │               Goods Issue (PGI) ──► VF01 Sales Invoice │
       └────────────────────────────────────────────────────────┘
```

---

## 2. SAP Business Workflows & Architecture

### A. Procurement Lifecycle (SAP MM)
1. **Purchase Requisition (PR)** (*SAP T-Code ME51N*): Internal department requests materials specifying quantities, required dates, and operational urgency (Low/Medium/High/Urgent).
2. **Purchase Order (PO)** (*SAP T-Code ME21N*): Approved requisitions are formally converted into legally binding vendor POs with tax calculations, payment terms, and delivery schedules.
3. **Goods Receipt (GR)** (*SAP T-Code MIGO*): When physical shipment arrives at warehouse:
   - System receives and inspects material batches.
   - Automatically increments warehouse on-hand inventory.
   - Writes an immutable **Goods Receipt** entry in the stock movements audit ledger.
   - Updates PO status from `Sent to Vendor` &rarr; `Partially Received` &rarr; `Fully Received`.
4. **Logistics Invoice Verification** (*SAP T-Code MIRO*): Automatically prepares vendor commercial bill with three-way settlement support.

### B. Order-to-Cash Lifecycle (SAP SD)
1. **Customer Sales Order** (*SAP T-Code VA01*): Sales representatives intake commercial orders with real-time **Available-to-Promise (ATP)** stock checks.
2. **Outbound Delivery Document** (*SAP T-Code VL01N*): Generates logistics dispatch documents designating source warehouse, shipping carrier, and line items.
3. **Post Goods Issue (PGI)** (*SAP T-Code VL02N / PGI*):
   - Physical inventory is decremented from the specific warehouse.
   - Logs an immutable **Goods Issue** ledger transaction.
   - **Zero Negative Stock Rule**: If stock is insufficient, the transaction hard-rejects and aborts atomically.
4. **Sales Billing Document** (*SAP T-Code VF01*): Posts tax invoice with payment terms, tracks cash collections, and calculates receivables (AR).

### C. Core Business Invariants & Rules
* **No Negative Stock**: Stock levels can never drop below zero. Database checks and application validation enforce this invariant atomically.
* **Overselling Prevention**: If an order requests 15 units of a material with only 10 units in stock, the entire line is hard rejected with an explicit HTTP 400 error. The balance remains unaltered at 10.
* **Immutable Stock Movement Ledger**: Stock quantities are *never* directly edited. Every change must be caused by a formal business event (`Goods Receipt`, `Goods Issue`, `Physical Count Adjustment`, `Transfer`, `Return`), recording balance before and after with user and batch stamps.
* **SOX-Compliant Audit Trail**: Every master data addition, price revision, and document status transition records before-and-after JSON payloads with user attribution.

---

## 3. Technology Stack

### Backend
- **Python 3.11** + **FastAPI**: High-performance asynchronous REST API with automatic OpenAPI documentation.
- **SQLAlchemy 2.0**: Object-relational mapping with strict database normalization, foreign key cascading, and transaction isolation.
- **Pydantic v2**: Strict schema validation and serialization.
- **PostgreSQL 16**: Enterprise ACID relational database (with automated SQLite fallback for instant zero-config local development).
- **PyJWT & Passlib (Bcrypt)**: Stateless JWT authentication with salted hashing.

### Frontend
- **React 19** + **TypeScript**: Strict type safety across all ERP entities and state.
- **Vite 8**: Ultra-fast build and development server.
- **Tailwind CSS v4**: Modern industrial enterprise UI styling.
- **React Router v7**: Nested layout routing with declarative Role-Based Access Control (RBAC) guards.
- **Recharts**: Responsive real-time financial and inventory data visualizations.
- **Lucide React**: Clean ERP interface iconography.
- **Axios**: Configured client with automatic JWT bearer injection and 401 token refresh interceptors.

---

## 4. User Roles & RBAC Matrix

StockFlow ERP enforces strict role-based authorization across all operations:

| Role | Permissions & Operational Scope |
| :--- | :--- |
| **Admin** | Full system access. Master configuration, user administration, global overrides, financial reports. |
| **Procurement Manager** | Manage vendors, approve purchase requisitions, issue POs, post Goods Receipts (MIGO), view purchase spend. |
| **Sales Manager** | Manage customers, create sales orders (VA01), issue outbound deliveries, generate invoices, record payments. |
| **Inventory Manager** | Manage multi-warehouse stock balances, execute physical stock adjustments, warehouse transfers, monitor reorder thresholds. |

---

## 5. Pre-seeded Demo Credentials

The database automatically seeds realistic test data including 4 role-based users, 3 warehouses, 5 product categories, 10 vendors, 15 customers, 30 materials, historical purchase orders, and sales cycles.

| Username | Password | Role | Primary Focus |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | **Admin** | Full system control & User management |
| `procurement` | `procure123` | **Procurement Manager** | Vendors, PRs, POs, Goods Receipts (MIGO) |
| `sales` | `sales123` | **Sales Manager** | Customers, Sales Orders (VA01), Invoices |
| `inventory` | `inv123` | **Inventory Manager** | Multi-warehouse stock, Adjustments, Transfers |

> **Quick Demo**: The login page includes a **1-Click Quick Fill** panel to immediately switch between roles without typing credentials.

---

## 6. Quick Start & Installation

### Option 1: Docker Compose (Recommended for Full Production Stack)

Run the complete multi-container setup (PostgreSQL 16 + FastAPI + Nginx React Frontend):

```bash
# 1. Clone repository
git clone https://github.com/your-username/stockflow-erp.git
cd stockflow-erp

# 2. Launch with Docker Compose
docker-compose up --build
```

Access the applications:
* **Web Application UI**: `http://localhost:3000`
* **FastAPI Backend & Interactive Swagger API**: `http://localhost:8000/docs`
* **PostgreSQL Database**: `localhost:5432`

---

### Option 2: Local Development Setup (Zero-Config SQLite Fallback)

#### Backend Setup
```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start FastAPI server (Automatically creates and seeds stockflow.db SQLite database)
uvicorn app.main:app --reload --port 8000
```
Backend runs at `http://127.0.0.1:8000`.

#### Frontend Setup
```bash
# 1. Open a new terminal and navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start Vite development server
npm run dev
```
Frontend runs at `http://localhost:5173`. Vite is pre-configured to proxy `/api` requests to `http://127.0.0.1:8000`.

---

## 7. Running the Automated Test Suite

StockFlow ERP features a comprehensive Pytest test suite testing auth, ATP stock availability, procurement lifecycles, order-to-cash sequences, and negative stock rejection invariants:

```bash
cd backend
venv\Scripts\pytest -v
```

Expected output:
```text
tests/test_auth.py::test_login_success PASSED
tests/test_auth.py::test_login_invalid_password PASSED
tests/test_auth.py::test_get_current_user_profile PASSED
tests/test_inventory_rules.py::test_prevent_overselling_hard_reject PASSED
tests/test_materials.py::test_get_materials PASSED
tests/test_materials.py::test_create_and_update_material PASSED
tests/test_procurement_flow.py::test_full_procurement_lifecycle PASSED
tests/test_sales_flow.py::test_full_sales_lifecycle PASSED

======================== 8 passed in 5.97s ========================
```

---

## 8. RESTful API Architecture

StockFlow ERP exposes 17 cleanly versioned REST modules under `/api/v1/`:

* `POST /api/v1/auth/login` – JWT bearer authentication.
* `GET /api/v1/dashboard/summary` – Real-time financial KPIs, stock valuation, and activity feed.
* `GET /api/v1/materials` – SAP Material Master with category, warehouse, and reorder levels.
* `POST /api/v1/purchase-requisitions` – Internal purchase request creation and approval workflow.
* `POST /api/v1/purchase-orders` – SAP MM Purchase Orders with vendor contract terms.
* `POST /api/v1/goods-receipts` – SAP MM MIGO physical intake and stock movement ledgering.
* `POST /api/v1/sales-orders` – SAP SD VA01 sales orders with ATP stock reservation.
* `POST /api/v1/deliveries/{id}/post-goods-issue` – SAP SD Post Goods Issue (PGI) stock deduction and invoice generation.
* `GET /api/v1/inventory/balances` – Multi-warehouse inventory stock matrix.
* `POST /api/v1/inventory/adjustments` – Physical cycle count stock adjustments.
* `POST /api/v1/inventory/transfers` – Inter-warehouse stock transfers.
* `GET /api/v1/invoices` – Sales billing (VF01) and Vendor invoices (MIRO).
* `POST /api/v1/invoices/payments` – Payment receipt and accounts settlement.
* `GET /api/v1/reports/inventory` – Inventory valuation report with CSV export.
* `GET /api/v1/audit-logs` – SOX-compliant immutable audit trail.

---

## 9. Portfolio & Resume Talking Points

Here are impactful resume bullets you can adapt based on this project:

* **Engineered Full-Stack ERP System**: Designed an enterprise-grade ERP platform modeled after **SAP MM and SD** workflows using **FastAPI, PostgreSQL, React 19, and TypeScript**, supporting multi-warehouse inventory and procurement lifecycles.
* **Guaranteed Transactional Stock Integrity**: Implemented strict database transactions and Available-to-Promise (ATP) algorithms, enforcing a zero-negative-inventory invariant and atomic rollbacks on overselling attempts.
* **Developed Immutable Ledger & SOX Audit Trail**: Architected a double-entry stock movement tracking engine and tamper-evident audit logging system capturing before-and-after state deltas for master data and inventory events.
* **Role-Based Access Control (RBAC)**: Implemented granular RBAC (Admin, Procurement, Sales, Inventory) utilizing JWT authorization in FastAPI and protected routes in React Router v7.
* **Containerized Production Deployment**: Containerized the application with Docker and Docker Compose, orchestrating PostgreSQL 16, a FastAPI ASGI server, and an Nginx-reverse-proxied React SPA.

---

## 10. License

This project is licensed under the MIT License - open for use, modification, and portfolio demonstration.
