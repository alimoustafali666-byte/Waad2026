-- مخطط قاعدة بيانات "وعد" — نسخة أولى (نطاق: الإمارات، اقتصاد هدايا كامل)

create extension if not exists "uuid-ossp";

create table users (
  id uuid primary key default uuid_generate_v4(),
  phone text unique not null,
  display_name text not null,
  country_code text not null default 'AE', -- AE / SA / EG لاحقًا
  is_host boolean not null default false,
  created_at timestamptz not null default now()
);

-- رموز التحقق (OTP) لتسجيل الدخول برقم الجوال
create table otp_codes (
  id uuid primary key default uuid_generate_v4(),
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_otp_codes_phone on otp_codes(phone);

create table agencies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  commission_percent numeric(5,2) not null default 20.00,
  owner_user_id uuid references users(id),
  created_at timestamptz not null default now()
);

create table hosts (
  user_id uuid primary key references users(id),
  agency_id uuid references agencies(id),
  diamond_balance bigint not null default 0
);

create table rooms (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  host_user_id uuid not null references users(id),
  is_live boolean not null default true,
  created_at timestamptz not null default now()
);

-- محفظة المستخدم (المستمع) بالعملات المشتراة بمال حقيقي
create table wallets (
  user_id uuid primary key references users(id),
  coin_balance bigint not null default 0
);

-- كل عملية شراء عملات حقيقية عبر PayTabs
create table coin_purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  amount_aed numeric(10,2) not null,
  coins_credited bigint not null,
  paytabs_transaction_ref text unique,
  status text not null default 'pending', -- pending / completed / failed
  created_at timestamptz not null default now()
);

-- كل هدية داخل غرفة: تُخصم عملات من المرسل وتُضاف ماس للمذيع بعد عمولة الوكالة
create table gifts (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id),
  sender_user_id uuid not null references users(id),
  host_user_id uuid not null references users(id),
  coin_cost bigint not null,
  diamonds_credited bigint not null,
  created_at timestamptz not null default now()
);

-- طلبات سحب أرباح المذيعين (يُنفَّذ يدويًا/عبر PayTabs Payouts في النسخة الأولى)
create table payout_requests (
  id uuid primary key default uuid_generate_v4(),
  host_user_id uuid not null references users(id),
  diamonds_requested bigint not null,
  status text not null default 'pending', -- pending / approved / paid / rejected
  requested_at timestamptz not null default now()
);
