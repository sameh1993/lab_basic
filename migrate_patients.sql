-- ==========================================
-- Migration: إضافة سجل المرضى
-- شغّل هذا إذا عندك قاعدة بيانات موجودة
-- ==========================================

USE lab_basic;

-- جدول المرضى
CREATE TABLE IF NOT EXISTS patients (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  full_name       VARCHAR(255)  NOT NULL,
  phone           VARCHAR(20)   DEFAULT NULL,
  phone2          VARCHAR(20)   DEFAULT NULL,
  national_id     VARCHAR(30)   DEFAULT NULL,
  gender          ENUM('ذكر','أنثى') DEFAULT 'ذكر',
  birth_date      DATE          DEFAULT NULL,
  blood_type      ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') DEFAULT NULL,
  address         VARCHAR(255)  DEFAULT NULL,
  notes           TEXT          DEFAULT NULL,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- إضافة عمود patient_id للفواتير
ALTER TABLE invoices
  ADD COLUMN patient_id INT DEFAULT NULL AFTER id,
  ADD FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;
