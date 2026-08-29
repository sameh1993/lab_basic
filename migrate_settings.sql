-- ==========================================
-- Migration: إعدادات المركز (الاسم، الشعار، العنوان، الهواتف)
-- شغّل هذا إذا عندك قاعدة بيانات موجودة
-- ==========================================

USE lab_basic;

CREATE TABLE IF NOT EXISTS settings (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  lab_name        VARCHAR(255) NOT NULL DEFAULT '',
  lab_address     VARCHAR(255) NOT NULL DEFAULT '',
  lab_phone       VARCHAR(20)  NOT NULL DEFAULT '',
  lab_phone2      VARCHAR(20)  DEFAULT NULL,
  lab_logo        LONGTEXT     DEFAULT NULL,
  admin_pass_hash VARCHAR(255) DEFAULT NULL,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- لو الجدول موجود بالفعل أضِف العمود الجديد
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'admin_pass_hash');
SET @sql := IF(@col = 0,
  'ALTER TABLE settings ADD COLUMN admin_pass_hash VARCHAR(255) DEFAULT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;