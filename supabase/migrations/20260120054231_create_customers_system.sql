/*
  # إنشاء نظام العملاء

  ## التغييرات الرئيسية
  
  1. إنشاء sequence لأرقام حسابات العملاء المحليين
  2. إنشاء جدول local_customers للعملاء غير المسجلين
  3. إنشاء جدول user_customers لقائمة عملاء كل مستخدم
  4. إضافة قيود لضمان سلامة البيانات
  5. تفعيل RLS وإضافة السياسات الأمنية

  ## الجداول الجديدة
  
  - `local_customers`: العملاء المحليين (غير مسجلين)
    - `id` (uuid، مفتاح أساسي)
    - `owner_id` (uuid، مرجع للمستخدم المالك)
    - `display_name` (text، اسم العميل)
    - `phone` (text، رقم الهاتف اختياري)
    - `note` (text، ملاحظات اختيارية)
    - `local_account_number` (bigint، رقم الحساب المحلي التلقائي)
    - `created_at` (timestamptz، تاريخ الإنشاء)
  
  - `user_customers`: قائمة العملاء لكل مستخدم
    - `id` (uuid، مفتاح أساسي)
    - `owner_id` (uuid، مرجع للمستخدم المالك)
    - `kind` (text، نوع العميل: registered أو local)
    - `registered_user_id` (uuid، مرجع للمستخدم المسجل إن وجد)
    - `local_customer_id` (uuid، مرجع للعميل المحلي إن وجد)
    - `created_at` (timestamptz، تاريخ الإنشاء)

  ## الأمان
  - RLS مفعّل على كلا الجدولين
  - المستخدمون يمكنهم فقط رؤية وإدارة عملائهم
  - منع الازدواجية للعملاء المسجلين
  - التحقق من اتساق البيانات حسب النوع
*/

-- إنشاء sequence لأرقام الحسابات المحلية
CREATE SEQUENCE IF NOT EXISTS public.local_account_seq START 1 INCREMENT 1;

-- جدول العملاء المحليين (غير المسجلين)
CREATE TABLE IF NOT EXISTS public.local_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  phone text,
  note text,
  local_account_number bigint UNIQUE NOT NULL DEFAULT nextval('public.local_account_seq'),
  created_at timestamptz DEFAULT now()
);

-- جدول قائمة العملاء لكل مستخدم
CREATE TABLE IF NOT EXISTS public.user_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('registered', 'local')),
  registered_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  local_customer_id uuid REFERENCES public.local_customers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  -- التحقق من اتساق البيانات حسب النوع
  CONSTRAINT check_registered_consistency 
    CHECK (
      (kind = 'registered' AND registered_user_id IS NOT NULL AND local_customer_id IS NULL) OR
      (kind = 'local' AND local_customer_id IS NOT NULL AND registered_user_id IS NULL)
    )
);

-- منع ازدواجية العملاء المسجلين
CREATE UNIQUE INDEX IF NOT EXISTS unique_registered_customer 
  ON public.user_customers(owner_id, registered_user_id) 
  WHERE registered_user_id IS NOT NULL;

-- تفعيل RLS على local_customers
ALTER TABLE public.local_customers ENABLE ROW LEVEL SECURITY;

-- سياسات local_customers
CREATE POLICY "Users can view own local customers"
  ON public.local_customers FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create own local customers"
  ON public.local_customers FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own local customers"
  ON public.local_customers FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own local customers"
  ON public.local_customers FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- تفعيل RLS على user_customers
ALTER TABLE public.user_customers ENABLE ROW LEVEL SECURITY;

-- سياسات user_customers
CREATE POLICY "Users can view own customer list"
  ON public.user_customers FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can add to own customer list"
  ON public.user_customers FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can remove from own customer list"
  ON public.user_customers FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- إنشاء view للبحث عن المستخدمين المسجلين بشكل آمن
CREATE OR REPLACE VIEW public.search_profiles AS
SELECT 
  id,
  username,
  full_name,
  account_number
FROM public.profiles;

-- تفعيل RLS على الـ view
ALTER VIEW public.search_profiles SET (security_barrier = true);

-- السماح للمستخدمين المصادق عليهم بالبحث
GRANT SELECT ON public.search_profiles TO authenticated;