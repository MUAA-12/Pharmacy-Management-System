# PharmaReserve: Pharmacy Medicine Availability & Reservation System

A complete, full-stack web application designed for university DBMS coursework and viva demonstrations. The system manages medicine cataloging, stock availability, customer registrations, and medicine reservations with genuine **ACID transaction processing** and row-level locking (`SELECT ... FOR UPDATE`).

---

## 1. Technology Stack

- **Frontend:** React 18 with Vite (Modern JavaScript, clean responsive CSS design system)
- **Backend:** Node.js & Express REST API
- **Database:** MySQL 8.0 (InnoDB engine, foreign keys, check constraints, row-level locks)
- **Database Driver:** `mysql2/promise` with connection pooling
- **Operating Environment:** Windows (PowerShell / Command Prompt)

---

## 2. Database Architecture & Schema Design

Database Name: `pharmacy_db`

### Tables and Relationships

1. **`medicines`**:
   - `medicine_id`: INT AUTO_INCREMENT (Primary Key)
   - `name`: VARCHAR(100) NOT NULL
   - `category`: VARCHAR(50)
   - `unit_price`: DECIMAL(10,2) NOT NULL (CHECK `unit_price >= 0`)
   - `stock_quantity`: INT NOT NULL (CHECK `stock_quantity >= 0`)
   - `expiry_date`: DATE NOT NULL
   - `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

2. **`customers`**:
   - `customer_id`: INT AUTO_INCREMENT (Primary Key)
   - `name`: VARCHAR(100) NOT NULL
   - `phone`: VARCHAR(20) NOT NULL UNIQUE (Phone acts as unique customer identifier)
   - `email`: VARCHAR(100)
   - `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

3. **`reservations`**:
   - `reservation_id`: INT AUTO_INCREMENT (Primary Key)
   - `customer_id`: INT NOT NULL (Foreign Key -> `customers(customer_id) ON DELETE RESTRICT`)
   - `reservation_date`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   - `status`: ENUM('Pending', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending'
   - `total_amount`: DECIMAL(10,2) NOT NULL DEFAULT 0.00
   - `notes`: VARCHAR(255)
   - `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

4. **`reservation_items`**:
   - `reservation_id`: INT NOT NULL (Foreign Key -> `reservations(reservation_id) ON DELETE CASCADE`)
   - `medicine_id`: INT NOT NULL (Foreign Key -> `medicines(medicine_id) ON DELETE RESTRICT`)
   - `quantity`: INT NOT NULL (CHECK `quantity > 0`)
   - `unit_price`: DECIMAL(10,2) NOT NULL (Captures price snapshot at reservation time)
   - `PRIMARY KEY (reservation_id, medicine_id)`

---

## 3. DBMS ACID Transaction Invariants

### A. Atomic Reservation Creation (`POST /api/reservations`)
1. **Begin Transaction:** `await connection.beginTransaction()`
2. **Customer Validation:** Checks customer existence.
3. **Combine Duplicate Items:** If a medicine is passed multiple times in one request, quantities are safely combined.
4. **Row-Level Locking:** Executes `SELECT ... FROM medicines WHERE medicine_id IN (...) FOR UPDATE`.
5. **Business Rule Verifications:**
   - Verifies all medicine IDs exist in database.
   - Verifies medicine is **not expired** (`expiry_date >= CURRENT_DATE`).
   - Verifies **sufficient stock** (`stock_quantity >= requested_qty`).
6. **Price Snapshot & Total:** Calculates total amount solely from database unit prices (never trusts client prices).
7. **Insertion:** Inserts header into `reservations` and rows into `reservation_items`.
8. **Stock Deduction:** Atomically deducts reserved quantities from `medicines.stock_quantity`.
9. **Commit:** `await connection.commit()`. If any step fails, `await connection.rollback()` reverts all partial writes.

### B. Safe Reservation Cancellation (`PUT /api/reservations/:id/cancel`)
1. **Begin Transaction:** Locks reservation row with `FOR UPDATE`.
2. **Status Guard:** Verifies reservation is currently `Pending`. If already `Cancelled` or `Completed`, rejects with 400 error.
3. **Stock Restoration:** Fetches reserved items and restores `medicines.stock_quantity = stock_quantity + quantity`.
4. **Status Update:** Updates reservation status to `Cancelled`.
5. **Commit:** Commits transaction. Ensures stock is restored **exactly once** (idempotent).

### C. Safe Reservation Completion (`PUT /api/reservations/:id/complete`)
- Transitions status from `Pending` to `Completed`.
- **Double-Deduction Prevention:** Stock is **not** deducted a second time because stock was already allocated when the reservation was initially created.

### D. Foreign Key Safe Deletion
- Medicines referenced in `reservation_items` cannot be deleted (`ON DELETE RESTRICT`). The API returns HTTP 409 Conflict with a clear audit protection message.

---

## 4. How to Setup & Run the Application

### Step 1: Execute Database Setup in MySQL Workbench
1. Open **MySQL Workbench** and connect to your local MySQL instance.
2. Click **File -> Open SQL Script...** and select:
   ```text
   C:\Users\Zimal Laptop\.gemini\antigravity\scratch\PharmacySystem\database\schema.sql
   ```
3. Click the yellow **Lightning Bolt** icon (Execute) to run the script.
4. In the Schemas tab on the left, right-click and select **Refresh All**. You will see `pharmacy_db` with `medicines`, `customers`, `reservations`, and `reservation_items`.

### Step 2: Configure Database Password in `.env`
1. Open the file:
   ```text
   C:\Users\Zimal Laptop\.gemini\antigravity\scratch\PharmacySystem\backend\.env
   ```
2. Replace `DB_PASSWORD=root` with your actual MySQL root password:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_real_mysql_password
   DB_NAME=pharmacy_db
   ```
3. Save the file.

### Step 3: Run the Application
You can launch both servers together with a single double-click:
- Double click **`run-app.bat`** located inside `PharmacySystem/`.

Or run them individually via Windows PowerShell:
- **Backend Terminal:**
  ```powershell
  cd "C:\Users\Zimal Laptop\.gemini\antigravity\scratch\PharmacySystem\backend"
  node server.js
  ```
- **Frontend Terminal:**
  ```powershell
  cd "C:\Users\Zimal Laptop\.gemini\antigravity\scratch\PharmacySystem\frontend"
  npm run dev
  ```

Open your browser at:
```text
http://localhost:5173
```

---

## 5. Automated DBMS Transaction Test Suite

To demonstrate transaction handling and integrity to your instructor or viva examiner:
- Double click **`run-tests.bat`** in `PharmacySystem/`, OR run:
  ```powershell
  cd "C:\Users\Zimal Laptop\.gemini\antigravity\scratch\PharmacySystem\backend"
  npm test
  ```

### What the Test Suite Verifies:
1. `[TEST 1]` MySQL Database connection
2. `[TEST 2]` Customer registration & phone uniqueness constraint
3. `[TEST 3]` Medicine creation & search
4. `[TEST 4]` Atomic reservation creation & stock deduction
5. `[TEST 5]` Insufficient stock rollback (verifies stock remains unchanged)
6. `[TEST 6]` Expired medicine rejection (prohibits reserving expired drugs)
7. `[TEST 7]` Reservation cancellation & exact stock restoration
8. `[TEST 8]` Repeated cancellation prevention (idempotent stock protection)
9. `[TEST 9]` Completing reservation invariant (prevents double stock deduction)
10. `[TEST 10]` Safe deletion prevention (blocks deleting medicines with reservation history)
11. `[TEST 11]` Reports & dashboard SQL aggregation queries

---

## 6. REST API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check & MySQL status diagnostics |
| `GET` | `/api/medicines` | List medicines with search, category & availability filters |
| `GET` | `/api/medicines/categories` | Get distinct medicine categories |
| `GET` | `/api/medicines/:id` | Get single medicine details |
| `POST` | `/api/medicines` | Create new medicine |
| `PUT` | `/api/medicines/:id` | Update medicine details |
| `DELETE` | `/api/medicines/:id` | Safe delete medicine (blocked if referenced) |
| `GET` | `/api/customers` | List customers with search & reservation counts |
| `GET` | `/api/customers/:id` | Get customer details with full reservation history |
| `POST` | `/api/customers` | Register customer (unique phone validation) |
| `PUT` | `/api/customers/:id` | Update customer profile |
| `DELETE` | `/api/customers/:id` | Safe delete customer |
| `GET` | `/api/reservations` | List reservations with status & search filter |
| `GET` | `/api/reservations/:id` | Get reservation details & itemized receipt |
| `POST` | `/api/reservations` | **Atomic ACID Reservation Creation** |
| `PUT` | `/api/reservations/:id/cancel` | **Atomic Cancellation & Stock Restoration** |
| `PUT` | `/api/reservations/:id/complete` | Complete reservation fulfillment |
| `GET` | `/api/reports/dashboard` | Dashboard overview metrics & critical alerts |
| `GET` | `/api/reports/inventory` | Inventory valuation & stock audit |
| `GET` | `/api/reports/low-stock` | Low-stock items ordered by urgency |
| `GET` | `/api/reports/expiry` | Expired & near-expiry medicines |
| `GET` | `/api/reports/sales-by-date`| Completed reservations daily revenue |
| `GET` | `/api/reports/top-medicines` | Top reserved medicines leaderboard |

---

## 7. Viva / External Demonstration Tips

During your viva, highlight these DBMS concepts implemented in your project:
1. **Concurrency Control:** Show `SELECT ... FOR UPDATE` in [`backend/services/reservationService.js`](file:///C:/Users/Zimal%20Laptop/.gemini/antigravity/scratch/PharmacySystem/backend/services/reservationService.js) to explain how row-level locking prevents race conditions and negative inventory.
2. **Atomicity & Consistency:** Demonstrate Test 5 (insufficient stock) and explain how `connection.rollback()` guarantees that either all reservation items and stock deductions occur or none occur.
3. **Price Snapshot Integrity:** Point out that `reservation_items` stores `unit_price` at the time of reservation, preserving historical accuracy even if medicine prices change later.
4. **Referential Integrity:** Explain how `ON DELETE RESTRICT` protects historical transactions from orphaned records.
