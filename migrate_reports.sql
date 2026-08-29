-- ==========================================
-- Migration: التكلفة + المصروفات (لتقرير الربح والخسارة)
-- شغّل هذا إذا عندك قاعدة بيانات موجودة
-- (البرنامج بيشغّله أيضاً تلقائياً عند أول تشغيل)
-- ==========================================

USE lab_basic;

-- تكلفة التحليل داخل كتالوج التحاليل
ALTER TABLE tests_catalog
  ADD COLUMN cost DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER price;

-- تخزين التكلفة لحظياً داخل كل بند فاتورة وقت الإنشاء
ALTER TABLE invoice_items
  ADD COLUMN cost DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER price;

-- جدول المصروفات
CREATE TABLE IF NOT EXISTS expenses (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  category    VARCHAR(100)  DEFAULT 'عام',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;