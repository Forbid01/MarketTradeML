-- supabase/seed.sql — LOCAL/DEV демо өгөгдөл.
-- `supabase db reset` эсвэл `supabase start` үед автоматаар ажиллана (production-д БИШ).
-- auth.users-д оруулахад handle_new_auth_user trigger public.users-ийг автоматаар үүсгэнэ.
-- (Эдгээр нь ХАРАГДАХ зориулалттай seed — нэвтрэхийн тулд Studio-аас нууц үг тавь
--  эсвэл Google/OTP ашигла.)

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'seller1@example.com', now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Болд (зарагч)"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'seller2@example.com', now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Сараа (зарагч)"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'buyer@example.com', now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Тэмүүлэн (худалдан авагч)"}', '', '', '', '')
on conflict (id) do nothing;

-- Профайлыг чимэх (trigger аль хэдийн үүсгэсэн)
update public.users set is_verified = true,  rating_avg = 4.8, trades_count = 12
  where auth_id = '11111111-1111-1111-1111-111111111111';
update public.users set is_verified = false, rating_avg = 4.2, trades_count = 3
  where auth_id = '22222222-2222-2222-2222-222222222222';

-- Демо зар
insert into public.listings
  (seller_id, title, price, server, rank, description, level, heroes_count, skins_count, win_rate)
select u.id, v.title, v.price, v.server, v.rank, v.descr, v.lvl, v.heroes, v.skins, v.wr
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid,
   'Mythical Glory · 80 баатар · 45 скин', 1200000, 'Asia', 'Mythical Glory',
   'Бүх binding цэвэр. Анхны эзэмшигч. Топ-ап баримттай.', 75, 80, 45, 58.5),
  ('11111111-1111-1111-1111-111111111111'::uuid,
   'Mythic · 50 баатар · 20 скин', 450000, 'Asia', 'Mythic',
   'Хямд эхлэлийн аккаунт.', 60, 50, 20, 52.0),
  ('22222222-2222-2222-2222-222222222222'::uuid,
   'Legend · эпик скинтэй', 300000, 'Europe', 'Legend',
   'Collector скин 2ш.', 55, 40, 15, 49.5)
) as v(seller_auth, title, price, server, rank, descr, lvl, heroes, skins, wr)
join public.users u on u.auth_id = v.seller_auth;
