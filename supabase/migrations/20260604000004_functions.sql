-- 0004 — Функц ба trigger
-- Build Plan 1.5 (туслах функц), 1.10 (escrow state machine), 1.14 (rating), users-ийн
-- итгэлцлийн багана хамгаалах, шинэ auth хэрэглэгчид профайл үүсгэх.

-- ───────────────────────── Туслах функцүүд ─────────────────────────

-- Нэвтэрсэн хэрэглэгчийн public.users.id
create or replace function public.current_user_id()
returns uuid
language sql stable security definer set search_path = public, auth
as $$
  select id from public.users where auth_id = auth.uid();
$$;

-- Админ эсэх — JWT app_metadata-аас (users хүснэгтээс шалгавал RLS infinite recursion гарна).
-- ⚠️ ОПЕРАЦИЙН ТЭМДЭГЛЭЛ: эрх олгохдоо ХОЁУЛАНГ нь тааруулна —
--   (1) public.users.role = 'admin'  (апп UI-ийн нөхцөлд),
--   (2) auth.users.raw_app_meta_data->>'role' = 'admin'  (RLS/is_admin()-д; зөвхөн service_role/
--       dashboard-оор тавигдана, хэрэглэгч өөрөө өөрчилж чадахгүй).
-- Зөвхөн нэгийг нь тавьбал "split-brain" (UI админ мэт ч RLS татгалзах, эсвэл эсрэгээр) болно.
create or replace function public.is_admin()
returns boolean
language sql stable set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- Тухайн захиалгын оролцогч эсэх (RLS-д ашиглана)
create or replace function public.is_order_party(p_order_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (o.buyer_id = public.current_user_id() or o.seller_id = public.current_user_id())
  );
$$;

-- ───────────── Escrow суллахад шаардлагатай checklist бүрэн эсэх ─────────────
-- Аюулгүй байдлын ГОЛ багц: худалдан авагчийн эзэмшил бүрэн шилжсэн (и-мэйл/recovery/2FA/
-- secondary + эцсийн баталгаа) БА зарагчийн эрх таслагдсан/баримт өгсөн/"эргүүлэн нэхэхгүй".
-- inspecting→completed (гар ба автомат) ХОЁУЛАНГ нь энэ нэг эх сурвалжаар хаалттай байлгана.
-- (Facebook/Google/TikTok unbound нь аккаунт бүрт байдаггүй тул заавал биш.)
create or replace function public.checklist_release_ok(p_order_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select tc.primary_email_ownership_transferred
       and tc.email_password_changed_by_buyer
       and tc.recovery_phone_changed_by_buyer
       and tc.secondary_verification_email_transferred
       and tc.two_fa_reset_done
       and tc.verified_by_buyer
       and tc.seller_link_cut
       and tc.seller_signed_release
       and tc.original_topup_receipts_handed_over
    from public.transfer_checklist tc
    where tc.order_id = p_order_id
  ), false);
$$;

-- ───────────────────── updated_at автомат шинэчлэл ─────────────────────
create trigger set_updated_at before update on public.users
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.listings
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.orders
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.transfer_checklist
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.credentials_handoff
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.disputes
  for each row execute function extensions.moddatetime(updated_at);

-- ───────────── Шинэ auth хэрэглэгчид профайл автоматаар үүсгэх ─────────────
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer set search_path = public, auth
as $$
begin
  insert into public.users (auth_id, display_name, phone)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      nullif(split_part(coalesce(new.email,''), '@', 1), ''),
      'Хэрэглэгч'
    ),
    new.phone
  )
  on conflict (auth_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ───────────── users-ийн итгэлцлийн баганыг хамгаалах ─────────────
-- Хэрэглэгч өөрийгөө is_verified/role/rating/trades болгох ёсгүй. RLS багана түвшинд
-- ялгадаггүй тул trigger-ээр хамгаална. trigger дотроос rating шинэчлэхэд (доорх
-- recompute функц) tx-local флагаар зөвшөөрнө.
create or replace function public.guard_user_privileged_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_admin() or current_setting('app.allow_trust_update', true) = '1' then
    return new;
  end if;
  new.role         := old.role;
  new.is_verified  := old.is_verified;
  new.rating_avg   := old.rating_avg;
  new.trades_count := old.trades_count;
  new.auth_id      := old.auth_id;
  return new;
end;
$$;

create trigger trg_guard_user_cols before update on public.users
  for each row execute function public.guard_user_privileged_columns();

-- ───────────── Зарагчийн rating дахин тооцоолох ─────────────
create or replace function public.recompute_seller_rating()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare sid uuid := coalesce(new.seller_id, old.seller_id);
begin
  perform set_config('app.allow_trust_update', '1', true);
  update public.users u
    set rating_avg = coalesce(
      (select round(avg(r.stars)::numeric, 2) from public.reviews r where r.seller_id = sid), 0)
    where u.id = sid;
  return null;
end;
$$;

create trigger trg_recompute_rating
  after insert or update or delete on public.reviews
  for each row execute function public.recompute_seller_rating();

-- ───────────── trades_count: зөвхөн completed + paid_out ─────────────
create or replace function public.bump_trades_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'completed' and new.payout_status = 'paid_out'
     and (old.payout_status is distinct from new.payout_status
          or old.status is distinct from new.status) then
    perform set_config('app.allow_trust_update', '1', true);
    update public.users set trades_count = trades_count + 1 where id = new.seller_id;
  end if;
  return null;
end;
$$;

create trigger trg_bump_trades after update on public.orders
  for each row execute function public.bump_trades_count();

-- ───────────── Захиалга үүсгэх (атомик) ─────────────
-- listing-ийг түгжиж, идэвхтэй эсэхийг шалгаж, шимтгэл тооцож, захиалга + checklist +
-- credentials_handoff үүсгэж, listing-ийг reserved болгоно (давхар зарахаас сэргийлнэ).
create or replace function public.order_create(p_listing_id uuid)
returns public.orders
language plpgsql security definer set search_path = public
as $$
declare
  l    public.listings;
  uid  uuid := public.current_user_id();
  o    public.orders;
  v_fee bigint;
begin
  if uid is null then raise exception 'нэвтрээгүй байна'; end if;

  select * into l from public.listings where id = p_listing_id for update;
  if not found or l.deleted_at is not null then raise exception 'зар олдсонгүй'; end if;
  if l.status <> 'active' then raise exception 'зар идэвхгүй (бэлэн бус)'; end if;
  if l.seller_id = uid then raise exception 'өөрийн зарыг худалдаж авах боломжгүй'; end if;

  v_fee := round(l.price * 0.05);  -- 5% платформын шимтгэл (дараа тохиргоо болгоно)

  insert into public.orders (listing_id, buyer_id, seller_id, amount, fee, status)
  values (l.id, uid, l.seller_id, l.price, v_fee, 'created')
  returning * into o;

  insert into public.transfer_checklist (order_id) values (o.id);
  insert into public.credentials_handoff (order_id, expires_at)
  values (o.id, now() + interval '7 days');

  update public.listings set status = 'reserved' where id = l.id;
  return o;
end;
$$;

-- ───────────── Escrow төлөв шилжүүлэх (атомик, FOR UPDATE) ─────────────
-- Зөвшөөрөгдсөн шилжилтийн матриц + actor guard. Бүх шилжилт мөрийг түгжиж compare-and-set
-- хийдэг ганц цэг — таймер vs маргаан, хоцорсон callback зэрэг race condition-оос хамгаална.
create or replace function public.order_transition(p_order_id uuid, p_target public.order_status)
returns public.orders
language plpgsql security definer set search_path = public
as $$
declare
  o         public.orders;
  uid       uuid    := public.current_user_id();
  admin     boolean := public.is_admin();
  is_buyer  boolean;
  is_seller boolean;
  ok        boolean := false;
begin
  select * into o from public.orders where id = p_order_id for update;  -- мөрийг түгжих
  if not found then raise exception 'захиалга олдсонгүй'; end if;

  is_buyer  := (o.buyer_id  = uid);
  is_seller := (o.seller_id = uid);
  if not (admin or is_buyer or is_seller) then
    raise exception 'энэ захиалгад эрх байхгүй';
  end if;

  if o.status in ('completed','cancelled','expired','refunded') then
    raise exception 'захиалга эцсийн төлөвт (%), шилжилт хориотой', o.status;
  end if;

  ok := case
    when o.status = 'created'      and p_target = 'paid'         and admin                  then true
    when o.status = 'created'      and p_target = 'cancelled'    and (is_buyer or admin)    then true
    when o.status = 'created'      and p_target = 'expired'      and admin                  then true
    when o.status = 'paid'         and p_target = 'transferring' and (is_seller or admin)   then true
    when o.status = 'transferring' and p_target = 'inspecting'   and (is_buyer or admin)    then true
    when o.status = 'inspecting'   and p_target = 'completed'    and (is_buyer or admin)    then true
    when o.status in ('transferring','inspecting') and p_target = 'disputed'                then true
    when o.status = 'disputed'     and p_target = 'completed'    and admin                  then true
    when o.status = 'disputed'     and p_target = 'refunded'     and admin                  then true
    when o.status = 'inspecting'   and p_target = 'expired'      and admin                  then true
    else false
  end;
  if not ok then
    raise exception 'шилжилт % -> % энэ хэрэглэгчид зөвшөөрөгдөхгүй', o.status, p_target;
  end if;

  -- ESCROW ГОЛ ХЯНАЛТ: худалдан авагч escrow-г суллахын (inspecting→completed) тулд
  -- эзэмшлийн checklist бүрэн байх ёстой. Админ зөвхөн маргаан шийдвэрлэхэд override хийнэ
  -- (audit_log-д бичигдэнэ). Энэ нь "буцааж авах" scam-аас сэргийлэх цөм механизм.
  if p_target = 'completed' and o.status = 'inspecting' and not admin then
    if not public.checklist_release_ok(o.id) then
      raise exception 'шилжүүлгийн checklist бүрэн биш — эзэмшил баталгаажаагүй тул дуусгах боломжгүй';
    end if;
  end if;

  update public.orders
     set status = p_target,
         inspection_ends = case
           when p_target = 'inspecting' then now() + interval '48 hours'
           else inspection_ends
         end
   where id = o.id
   returning * into o;

  -- listing төлөвийг escrow-той синк (давхар зарахаас сэргийлнэ)
  if p_target = 'completed' then
    update public.listings set status = 'sold' where id = o.listing_id;
  elsif p_target in ('cancelled','expired','refunded') then
    update public.listings set status = 'active' where id = o.listing_id and status = 'reserved';
  end if;

  return o;
end;
$$;

-- ───────────── Transfer checklist-ийн нэг талбар тэмдэглэх (тал бүрийн эрхтэй) ─────────────
-- RLS багана түвшинд ялгадаггүй тул чеклистийг ШУУД update хийхгүй (0005-д update policy
-- хаасан). Зөвхөн энэ RPC-ээр: buyer-side талбарыг зөвхөн худалдан авагч, seller-side-ийг
-- зөвхөн зарагч тэмдэглэнэ. p_field-ийг whitelist-ээр шалгасан тул format(%I) аюулгүй.
create or replace function public.set_checklist_item(p_order_id uuid, p_field text, p_value boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  uid   uuid    := public.current_user_id();
  admin boolean := public.is_admin();
  o     public.orders;
  v_side text;
begin
  if uid is null then raise exception 'нэвтрээгүй байна'; end if;
  select * into o from public.orders where id = p_order_id;
  if not found then raise exception 'захиалга олдсонгүй'; end if;
  if not (admin or o.buyer_id = uid or o.seller_id = uid) then
    raise exception 'энэ захиалгад эрх байхгүй';
  end if;
  if o.status not in ('transferring','inspecting','disputed') then
    raise exception 'checklist-ийг зөвхөн шилжүүлэг/шалгалт/маргааны үед засна (одоо: %)', o.status;
  end if;

  v_side := case p_field
    when 'primary_email_ownership_transferred'      then 'buyer'
    when 'email_password_changed_by_buyer'          then 'buyer'
    when 'recovery_phone_changed_by_buyer'          then 'buyer'
    when 'secondary_verification_email_transferred' then 'buyer'
    when 'two_fa_reset_done'                        then 'buyer'
    when 'verified_by_buyer'                        then 'buyer'
    when 'facebook_unbound'                         then 'seller'
    when 'google_unbound'                           then 'seller'
    when 'tiktok_unbound'                           then 'seller'
    when 'original_topup_receipts_handed_over'      then 'seller'
    when 'seller_signed_release'                    then 'seller'
    when 'seller_link_cut'                          then 'seller'
    else null
  end;
  if v_side is null then raise exception 'буруу checklist талбар: %', p_field; end if;

  if not admin then
    if v_side = 'buyer'  and o.buyer_id  <> uid then
      raise exception 'энэ хэсгийг зөвхөн худалдан авагч тэмдэглэнэ';
    end if;
    if v_side = 'seller' and o.seller_id <> uid then
      raise exception 'энэ хэсгийг зөвхөн зарагч тэмдэглэнэ';
    end if;
  end if;

  execute format('update public.transfer_checklist set %I = $1 where order_id = $2', p_field)
    using p_value, p_order_id;
end;
$$;

-- ───────────── Маргаан нээх (атомик) ─────────────
create or replace function public.open_dispute(p_order_id uuid, p_reason text)
returns public.disputes
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := public.current_user_id();
  o   public.orders;
  d   public.disputes;
begin
  if uid is null then raise exception 'нэвтрээгүй байна'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'захиалга олдсонгүй'; end if;
  if not (o.buyer_id = uid or o.seller_id = uid or public.is_admin()) then
    raise exception 'энэ захиалгад эрх байхгүй';
  end if;
  if o.status not in ('transferring','inspecting') then
    raise exception 'маргааныг зөвхөн шилжүүлж/шалгаж байх үед нээнэ';
  end if;

  insert into public.disputes (order_id, opened_by, reason)
  values (o.id, uid, p_reason) returning * into d;

  update public.orders set status = 'disputed' where id = o.id;
  return d;
end;
$$;

-- ───────────── 48 цагийн inspection timeout sweep (Build Plan 1.15 / 3.7) ─────────────
-- Хугацаа дууссан 'inspecting' захиалгуудыг боловсруулна. checklist бүрэн биелсэн бол
-- 'completed' (олгох эрх нээгдэнэ — мөнгө автоматаар хөдлөхгүй), үгүй бол 'disputed'.
-- Phase 1-д гараар эсвэл cron-оор дуудаж болно; Phase 3-д pg_cron 5 мин тутам дуудна.
create or replace function public.sweep_inspection_timeouts()
returns int
language plpgsql security definer set search_path = public
as $$
declare r record; n int := 0; checklist_ok boolean;
begin
  for r in
    select id, listing_id from public.orders
    where status = 'inspecting' and inspection_ends < now()
    for update skip locked
  loop
    -- Гар суллалттай ИЖИЛ нөхцөл: эзэмшлийн бүх ГОЛ багц бүрэн биш бол completed болгохгүй,
    -- админд маргаан болгож шилжүүлнэ (partial checklist дээр автоматаар мөнгө суллахгүй).
    checklist_ok := public.checklist_release_ok(r.id);

    if coalesce(checklist_ok, false) then
      update public.orders set status = 'completed' where id = r.id;
      update public.listings set status = 'sold' where id = r.listing_id;
    else
      update public.orders set status = 'disputed' where id = r.id;
      insert into public.disputes (order_id, opened_by, reason)
        select r.id, o.seller_id, 'Шалгах хугацаа дуусав, checklist бүрэн биш — автомат маргаан'
        from public.orders o where o.id = r.id;
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- RPC-ээр дуудах функцуудын гүйцэтгэх эрх (RLS-ийг функц дотор шалгана)
grant execute on function public.order_create(uuid)              to authenticated;
grant execute on function public.order_transition(uuid, public.order_status) to authenticated;
grant execute on function public.set_checklist_item(uuid, text, boolean) to authenticated;
grant execute on function public.open_dispute(uuid, text)        to authenticated;
grant execute on function public.checklist_release_ok(uuid)      to authenticated;
grant execute on function public.current_user_id()              to authenticated, anon;
grant execute on function public.is_admin()                     to authenticated, anon;
grant execute on function public.is_order_party(uuid)           to authenticated;
-- sweep нь зөвхөн service_role / cron-оос дуудагдана (authenticated-д grant хийхгүй)
