-- ==========================================
-- Migration: إضافة نظام الدفع الجزئي
-- شغّل هذا إذا عندك قاعدة بيانات موجودة
-- ==========================================

-- USE lab_basic;

-- إضافة الأعمدة الجديدة لجدول الفواتير
ALTER TABLE invoices
  ADD COLUMN paid_amount    DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total_amount,
  ADD COLUMN payment_status ENUM('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid' AFTER paid_amount;

-- جدول سجل المدفوعات
CREATE TABLE IF NOT EXISTS payments (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id     INT            NOT NULL,
  amount         DECIMAL(10,2)  NOT NULL,
  payment_method ENUM('cash','card','transfer') DEFAULT 'cash',
  note           VARCHAR(255)   DEFAULT NULL,
  created_at     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- تحديث الفواتير القديمة المكتملة كمدفوعة بالكامل
UPDATE invoices
SET paid_amount    = total_amount,
    payment_status = 'paid'
WHERE status = 'completed';
