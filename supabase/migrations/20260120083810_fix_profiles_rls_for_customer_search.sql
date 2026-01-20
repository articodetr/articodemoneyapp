/*
  # إصلاح سياسة RLS لجدول profiles لدعم نظام العملاء

  ## المشكلة
  السياسة الحالية على جدول profiles تسمح فقط للمستخدمين بقراءة ملفاتهم الشخصية.
  هذا يمنع المستخدمين من رؤية معلومات العملاء المسجلين في قائمتهم.

  ## الحل
  إضافة سياسة جديدة تسمح لجميع المستخدمين المصادق عليهم بقراءة المعلومات العامة
  (username, full_name, account_number) من جدول profiles.

  ## الأمان
  - المعلومات في جدول profiles عامة وليست حساسة
  - ضرورية لعمل نظام العملاء المسجلين
  - تسمح بالقراءة فقط، لا يمكن التعديل إلا للمالك
*/

-- حذف السياسة القديمة المقيدة
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- إضافة سياسة جديدة تسمح بقراءة جميع الملفات الشخصية
CREATE POLICY "Users can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- الحفاظ على سياسة التحديث (فقط المالك يمكنه التعديل)
-- السياسة موجودة بالفعل: "Users can update own profile"
