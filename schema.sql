-- ==========================================
-- نظام إدارة مركز التحاليل - Basic v1.0
-- ==========================================

-- CREATE DATABASE IF NOT EXISTS railway
--   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE lab_basic;

-- ---- المرضى ----
CREATE TABLE IF NOT EXISTS patients (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  full_name   VARCHAR(255)  NOT NULL,
  phone       VARCHAR(20)   DEFAULT NULL,
  phone2      VARCHAR(20)   DEFAULT NULL,
  national_id VARCHAR(30)   DEFAULT NULL,
  gender      ENUM('ذكر','أنثى') DEFAULT 'ذكر',
  birth_date  DATE          DEFAULT NULL,
  blood_type  ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') DEFAULT NULL,
  address     VARCHAR(255)  DEFAULT NULL,
  notes       TEXT          DEFAULT NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- كتالوج التحاليل ----
CREATE TABLE IF NOT EXISTS tests_catalog (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255)  NOT NULL,
  category   VARCHAR(100)  NOT NULL DEFAULT 'عام',
  price      DECIMAL(10,2) NOT NULL,
  is_active  TINYINT(1)    NOT NULL DEFAULT 1,
  created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- الفواتير ----
CREATE TABLE IF NOT EXISTS invoices (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  patient_id      INT           DEFAULT NULL,
  invoice_number  VARCHAR(50)   UNIQUE NOT NULL,
  patient_name    VARCHAR(255)  NOT NULL,
  patient_phone   VARCHAR(20)   DEFAULT NULL,
  patient_age     INT           DEFAULT NULL,
  patient_gender  ENUM('ذكر','أنثى') DEFAULT 'ذكر',
  doctor_name     VARCHAR(255)  DEFAULT NULL,
  total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status  ENUM('unpaid','partial','paid') DEFAULT 'unpaid',
  status          ENUM('pending','completed','cancelled') DEFAULT 'pending',
  notes           TEXT          DEFAULT NULL,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- بنود الفاتورة ----
CREATE TABLE IF NOT EXISTS invoice_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id    INT           NOT NULL,
  test_id       INT           DEFAULT NULL,
  test_name     VARCHAR(255)  NOT NULL,
  test_category VARCHAR(100)  DEFAULT NULL,
  price         DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (test_id)    REFERENCES tests_catalog(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- سجل المدفوعات ----
CREATE TABLE IF NOT EXISTS payments (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id     INT           NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  payment_method ENUM('cash','card','transfer') DEFAULT 'cash',
  note           VARCHAR(255)  DEFAULT NULL,
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- بيانات أولية - كتالوج التحاليل
-- ==========================================
INSERT INTO tests_catalog (name, category, price) VALUES
  ('صورة دم كاملة CBC','دم',80),('سكر صائم','سكر',30),('سكر بعد الأكل','سكر',35),
  ('HbA1c سكر تراكمي','سكر',120),('وظائف الكلى (كاملة)','كلى',150),
  ('وظائف الكبد (كاملة)','كبد',150),('TSH هرمون الغدة','غدة درقية',100),
  ('T3 حر','غدة درقية',80),('T4 حر','غدة درقية',80),('فيتامين D3','فيتامينات',200),
  ('فيتامين B12','فيتامينات',150),('حمض الفوليك','فيتامينات',120),
  ('كوليسترول كلي','دهون',60),('دهون ثلاثية','دهون',60),
  ('LDL كوليسترول ضار','دهون',80),('HDL كوليسترول نافع','دهون',80),
  ('حديد في الدم','دم',80),('فيريتين','دم',150),('يوريا بولينا','كلى',40),
  ('كرياتينين','كلى',40),('حمض اليوريك','كلى',50),('CRP بروتين التهابي','مناعة',90),
  ('ESR سرعة الترسيب','دم',30),('تحليل بول كامل','بول',40),('تحليل براز','براز',40),
  ('PSA بروستاتا','هرمونات',200),('تحليل الحمل HCG','هرمونات',60),
  ('كالسيوم','معادن',50),('مغنيسيوم','معادن',60),('صوديوم وبوتاسيوم','معادن',80);
