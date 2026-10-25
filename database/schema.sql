-- =====================================================================
-- Pharmacy Medicine Availability & Reservation System
-- Database Schema: pharmacy_db
-- Safe, Idempotent Setup Script (Preserves Existing Data)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS pharmacy_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE pharmacy_db;

-- 1. MEDICINES TABLE
-- Preserves existing columns: medicine_id, name, category, unit_price, stock_quantity, expiry_date
CREATE TABLE IF NOT EXISTS medicines (
    medicine_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'General',
    unit_price DECIMAL(10,2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    expiry_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (unit_price >= 0),
    CHECK (stock_quantity >= 0)
) ENGINE=InnoDB;

-- Index for searching and filtering medicines
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicines_expiry ON medicines(expiry_date);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- 3. RESERVATIONS TABLE
-- Status: 'Pending', 'Completed', 'Cancelled'
CREATE TABLE IF NOT EXISTS reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    reservation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Pending', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    notes VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CHECK (total_amount >= 0)
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);

-- 4. RESERVATION_ITEMS TABLE
-- Matches university project requirements and composite primary key
CREATE TABLE IF NOT EXISTS reservation_items (
    reservation_id INT NOT NULL,
    medicine_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (reservation_id, medicine_id),
    FOREIGN KEY (reservation_id)
        REFERENCES reservations(reservation_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (medicine_id)
        REFERENCES medicines(medicine_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CHECK (quantity > 0),
    CHECK (unit_price >= 0)
) ENGINE=InnoDB;

-- 5. SAMPLE SEED DATA (Only inserted if records don't exist yet)
-- Note: Uses INSERT IGNORE to ensure existing records are never overwritten!

INSERT IGNORE INTO medicines (medicine_id, name, category, unit_price, stock_quantity, expiry_date) VALUES
(1, 'Paracetamol 500mg', 'Pain Relief', 50.00, 100, '2027-12-31'),
(2, 'Cetirizine 10mg', 'Antihistamine', 80.00, 50, '2027-10-31'),
(3, 'Vitamin C 500mg', 'Supplement', 120.00, 30, '2027-08-31'),
(4, 'Amoxicillin 500mg', 'Antibiotic', 150.00, 45, '2027-06-30'),
(5, 'Ibuprofen 400mg', 'Pain Relief', 75.00, 8, '2027-11-15'),
(6, 'Omeprazole 20mg', 'Antacid', 110.00, 25, '2027-09-20'),
(7, 'Metformin 500mg', 'Diabetes', 65.00, 5, '2027-07-14'),
(8, 'Atorvastatin 20mg', 'Cardiovascular', 210.00, 60, '2027-05-18'),
(9, 'Salbutamol Inhaler', 'Respiratory', 350.00, 15, '2027-12-01'),
(10, 'Eye Drops Refresh', 'Ophthalmology', 95.00, 4, '2026-11-30');

INSERT IGNORE INTO customers (customer_id, name, phone, email) VALUES
(1, 'Ahmed Khan', '03001234567', 'ahmed.khan@example.com'),
(2, 'Sara Ali', '03219876543', 'sara.ali@example.com'),
(3, 'Usman Tariq', '03335551122', 'usman.tariq@example.com');

-- Sample Initial Reservation for testing reports (if none exists)
INSERT IGNORE INTO reservations (reservation_id, customer_id, reservation_date, status, total_amount, notes) VALUES
(1, 1, DATE_SUB(NOW(), INTERVAL 2 DAY), 'Completed', 150.00, 'Customer picked up medicine'),
(2, 2, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Pending', 200.00, 'Reserved via phone call');

INSERT IGNORE INTO reservation_items (reservation_id, medicine_id, quantity, unit_price) VALUES
(1, 1, 3, 50.00),
(2, 2, 1, 80.00),
(2, 3, 1, 120.00);

-- =====================================================================
-- Helpful Verification Queries (Can be run in MySQL Workbench):
-- SELECT * FROM medicines;
-- SELECT * FROM customers;
-- SELECT * FROM reservations;
-- SELECT * FROM reservation_items;
-- =====================================================================
