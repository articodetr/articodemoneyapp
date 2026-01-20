/*
  # نظام الملفات الشخصية وأرقام الحسابات
  
  ## الجداول الجديدة
  
  ### جدول `profiles`
  - `id` (uuid) - معرّف المستخدم من auth.users
  - `role` (text) - دور المستخدم (admin أو customer)
  - `username` (text) - اسم المستخدم الفريد
  - `full_name` (text) - الاسم الكامل
  - `account_number` (bigint) - رقم الحساب الفريد التلقائي
  - `created_at` (timestamptz) - تاريخ الإنشاء
  
  ## الوظائف
  
  ### `handle_new_user()`
  - تُنشئ ملف شخصي تلقائياً عند تسجيل مستخدم جديد
  - تستخدم البيانات من raw_user_meta_data
  
  ## الأمان (RLS)
  - المستخدمون يمكنهم قراءة وتحديث ملفاتهم الشخصية فقط
*/

-- إنشاء sequence لأرقام الحسابات
CREATE SEQUENCE IF NOT EXISTS account_number_seq START 100000 INCREMENT 1;

-- إنشاء جدول profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  account_number bigint UNIQUE NOT NULL DEFAULT nextval('account_number_seq'),
  created_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة - المستخدمون يمكنهم قراءة ملفاتهم فقط
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- سياسة التحديث - المستخدمون يمكنهم تحديث ملفاتهم فقط
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- وظيفة إنشاء الملف الشخصي تلقائياً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تشغيل الوظيفة عند إنشاء مستخدم جديد
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
