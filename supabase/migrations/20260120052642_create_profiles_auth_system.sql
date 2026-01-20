/*
  # إنشاء نظام الملفات الشخصية والمصادقة

  ## التغييرات الرئيسية
  1. إنشاء sequence لأرقام الحسابات (يبدأ من 100000)
  2. إنشاء جدول profiles لتخزين بيانات المستخدمين
  3. تفعيل Row Level Security (RLS) على الجدول
  4. إضافة سياسات أمان للقراءة والتحديث
  5. إنشاء trigger تلقائي لإنشاء profile عند التسجيل

  ## الجداول الجديدة
  - `profiles`
    - `id` (uuid، مفتاح أساسي، مرتبط بـ auth.users)
    - `role` (text، الدور: admin أو customer)
    - `username` (text، اسم المستخدم الفريد)
    - `full_name` (text، الاسم الكامل)
    - `account_number` (bigint، رقم الحساب الفريد التلقائي)
    - `created_at` (timestamptz، تاريخ الإنشاء)

  ## الأمان
  - تم تفعيل RLS على جدول profiles
  - المستخدمون يمكنهم قراءة وتحديث بياناتهم الشخصية فقط
  - يتم إنشاء profile تلقائياً عند التسجيل عبر trigger

  ## ملاحظات مهمة
  - أرقام الحسابات تبدأ من 100000 وتزيد تلقائياً
  - اسم المستخدم يتم تخزينه بأحرف صغيرة
  - كل مستخدم جديد يحصل على دور 'customer' افتراضياً
*/

-- حذف الجدول القديم إن وجد
DROP TABLE IF EXISTS public.profiles CASCADE;

-- حذف الـ sequence القديم إن وجد
DROP SEQUENCE IF EXISTS public.account_number_seq CASCADE;

-- إنشاء sequence لأرقام الحسابات
CREATE SEQUENCE public.account_number_seq START 100000 INCREMENT 1;

-- إنشاء جدول الملفات الشخصية
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  account_number bigint UNIQUE NOT NULL DEFAULT nextval('public.account_number_seq'),
  created_at timestamptz DEFAULT now()
);

-- تفعيل Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المستخدم يمكنه قراءة بياناته فقط
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- سياسة التحديث: المستخدم يمكنه تحديث بياناته فقط
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- حذف الـ trigger والدالة القديمة إن وجدت
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- دالة لإنشاء profile تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    LOWER(COALESCE(NEW.raw_user_meta_data->>'username', '')),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer'
  );
  RETURN NEW;
END;
$$;

-- Trigger لتشغيل الدالة عند إنشاء مستخدم جديد
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();