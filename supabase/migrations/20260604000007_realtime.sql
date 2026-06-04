-- 0007 — Realtime (Build Plan 1.12: захиалгын чат)
-- messages/notifications-ийг supabase_realtime publication-д нэмж postgres_changes стрим
-- идэвхжүүлнэ. RLS нь Realtime-д ч хэрэгжинэ (зөвхөн захиалгын оролцогч мессеж хүлээн авна).

-- Зөвхөн "аль хэдийн нэмэгдсэн" (duplicate_object) алдааг л залгина — бусад алдааг (жишээ нь
-- publication байхгүй) НУУХГҮЙ дэлгэрүүлж migration-ийг чимээгүй амжилтгүй болгохоос сэргийлнэ.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- DELETE/UPDATE үед хуучин мөрийн утга (old record) Realtime payload-д бүрэн ирэхийн тулд
-- REPLICA IDENTITY FULL. Үгүй бол зөвхөн PK ирж, "is_read=false → true" зэрэг шилжилтийг
-- клиент талд ялгахад хүндрэлтэй болно.
alter table public.messages      replica identity full;
alter table public.notifications replica identity full;
