-- كل إضافات المخطط منذ النسخة الأولى — آمن للتشغيل بغض النظر عمّا طُبِّق مسبقًا
-- شغّل هذا الملف كاملًا مرة واحدة في Neon SQL Editor

create table if not exists room_seats (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  seat_number int not null,
  user_id uuid references users(id),
  is_muted boolean not null default false,
  unique (room_id, seat_number)
);
create index if not exists idx_room_seats_room on room_seats(room_id);

create table if not exists room_messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references users(id),
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_room_messages_room on room_messages(room_id, created_at);

create table if not exists gift_catalog (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  emoji text not null,
  coin_cost bigint not null,
  diamond_value bigint not null,
  sort_order int not null default 0
);
insert into gift_catalog (name, emoji, coin_cost, diamond_value, sort_order)
select * from (values
  ('وردة', '🌹', 10, 8, 1),
  ('قلب', '❤️', 50, 40, 2),
  ('تاج', '👑', 500, 400, 3),
  ('سيارة', '🚗', 2000, 1600, 4),
  ('ذئب وعد', '🐺', 5000, 4000, 5)
) as v(name, emoji, coin_cost, diamond_value, sort_order)
where not exists (select 1 from gift_catalog);

alter table users add column if not exists bio text not null default '';
alter table users add column if not exists avatar_emoji text not null default '🐺';
alter table users add column if not exists equipped_frame_id uuid;

create table if not exists follows (
  follower_id uuid not null references users(id),
  followed_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id)
);

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  type text not null,
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications(user_id, created_at desc);

alter table wallets add column if not exists total_coins_spent bigint not null default 0;

create table if not exists avatar_frames (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  emoji text not null,
  coin_cost bigint not null,
  sort_order int not null default 0
);

create table if not exists user_frames (
  user_id uuid not null references users(id),
  frame_id uuid not null references avatar_frames(id),
  purchased_at timestamptz not null default now(),
  primary key (user_id, frame_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_equipped_frame') then
    alter table users add constraint fk_equipped_frame foreign key (equipped_frame_id) references avatar_frames(id);
  end if;
end $$;

insert into avatar_frames (name, emoji, coin_cost, sort_order)
select * from (values
  ('إطار فضي', '⚪', 200, 1),
  ('إطار ذهبي', '🟡', 1000, 2),
  ('إطار ماسي', '💎', 5000, 3),
  ('إطار الذئب الملكي', '🐺', 15000, 4)
) as v(name, emoji, coin_cost, sort_order)
where not exists (select 1 from avatar_frames);
