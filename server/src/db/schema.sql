-- مخطط قاعدة بيانات "وعد" — نسخة أولى (نطاق: الإمارات، اقتصاد هدايا كامل)

create extension if not exists "uuid-ossp";

create table users (
  id uuid primary key default uuid_generate_v4(),
  phone text unique not null,
  display_name text not null,
  country_code text not null default 'AE', -- AE / SA / EG لاحقًا
  is_host boolean not null default false,
  bio text not null default '',
  avatar_emoji text not null default '🐺',
  equipped_frame_id uuid,
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

-- مقاعد الميكروفون داخل كل غرفة (٨ مقاعد افتراضيًا، مقعد فارغ = user_id فارغ)
create table room_seats (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  seat_number int not null,
  user_id uuid references users(id),
  is_muted boolean not null default false,
  unique (room_id, seat_number)
);

create index idx_room_seats_room on room_seats(room_id);

-- الدردشة النصية داخل الغرفة
create table room_messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references users(id),
  message text not null,
  created_at timestamptz not null default now()
);

create index idx_room_messages_room on room_messages(room_id, created_at);

-- قائمة الهدايا الافتراضية المتاحة للإرسال
create table gift_catalog (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  emoji text not null,
  coin_cost bigint not null,
  diamond_value bigint not null,
  sort_order int not null default 0
);

insert into gift_catalog (name, emoji, coin_cost, diamond_value, sort_order) values
  ('وردة', '🌹', 10, 8, 1),
  ('قلب', '❤️', 50, 40, 2),
  ('تاج', '👑', 500, 400, 3),
  ('سيارة', '🚗', 2000, 1600, 4),
  ('ذئب وعد', '🐺', 5000, 4000, 5);

-- المتابعة بين المستخدمين
create table follows (
  follower_id uuid not null references users(id),
  followed_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id)
);

-- الإشعارات
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  type text not null, -- follow / gift
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id, created_at desc);

-- إجمالي العملات التي أنفقها المستخدم مدى الحياة (لحساب مستوى VIP)
alter table wallets add column total_coins_spent bigint not null default 0;

-- متجر إطارات الصورة الرمزية
create table avatar_frames (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  emoji text not null,
  coin_cost bigint not null,
  sort_order int not null default 0
);

create table user_frames (
  user_id uuid not null references users(id),
  frame_id uuid not null references avatar_frames(id),
  purchased_at timestamptz not null default now(),
  primary key (user_id, frame_id)
);

alter table users add constraint fk_equipped_frame foreign key (equipped_frame_id) references avatar_frames(id);

insert into avatar_frames (name, emoji, coin_cost, sort_order) values
  ('إطار فضي', '⚪', 200, 1),
  ('إطار ذهبي', '🟡', 1000, 2),
  ('إطار ماسي', '💎', 5000, 3),
  ('إطار الذئب الملكي', '🐺', 15000, 4);
