/*
  # إضافة حقل selected_receipt_logo إلى app_settings

  1. Changes
    - إضافة حقل `selected_receipt_logo` لتخزين نوع الشعار المستخدم في السندات
    - القيم المحتملة: NULL (استخدام shop_logo), 'DEFAULT' (استخدام الشعار الافتراضي), أو URL للشعار المخصص

  2. Notes
    - الحقل اختياري ويسمح بـ NULL
    - إذا كان NULL، سيتم استخدام shop_logo
    - إذا كان 'DEFAULT'، سيتم استخدام أيقونة التطبيق الافتراضية
    - إذا كان URL، سيتم استخدام الشعار من هذا الرابط
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_settings' AND column_name = 'selected_receipt_logo'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN selected_receipt_logo text;
  END IF;
END $$;
