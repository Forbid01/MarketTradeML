-- 0008 — Phase 2: audit_log, DB guard, notifications, админ RPC.

-- ───────────── 2.4 audit_log ─────────────
create or replace function public.audit_row()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare act text := TG_ARGV[0];
begin
  insert into public.audit_log(actor_id, action, entity_type, entity_id, before, after)
  values (
    public.current_user_id(),
    act,
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('UPDATE','INSERT') then to_jsonb(new) else null end
  );
  return null;
end;
$$;

create trigger audit_dispute after update on public.disputes
  for each row when (old.status is distinct from new.status)
  execute function public.audit_row('dispute_resolved');

create trigger audit_user_verify after update on public.users
  for each row when (old.is_verified is distinct from new.is_verified)
  execute function public.audit_row('user_verified');

create trigger audit_payout after insert on public.payouts
  for each row execute function public.audit_row('payout_recorded');

create trigger audit_order_status after update on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.audit_row('order_status_change');

-- ───────────── 2.5 DB guard trigger-ууд ─────────────
-- Эцсийн төлвөөс цааш шилжихийг хориглоно (Studio/service_role дотроос ч).
create or replace function public.guard_order_terminal()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if old.status in ('completed','cancelled','expired','refunded')
     and new.status is distinct from old.status then
    raise exception 'захиалга эцсийн төлөвт (%) — төлөв өөрчлөх хориотой', old.status;
  end if;
  return new;
end;
$$;

create trigger trg_guard_order_terminal before update on public.orders
  for each row execute function public.guard_order_terminal();

-- payout зөвхөн 'completed' захиалгад
create or replace function public.guard_payout_insert()
returns trigger
language plpgsql set search_path = public
as $$
declare st public.order_status;
begin
  select status into st from public.orders where id = new.order_id;
  if st <> 'completed' then
    raise exception 'payout зөвхөн completed захиалгад (одоо: %)', st;
  end if;
  return new;
end;
$$;

create trigger trg_guard_payout before insert on public.payouts
  for each row execute function public.guard_payout_insert();

-- ───────────── 2.7 notifications trigger-ууд ─────────────
create or replace function public.notify_order_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications(user_id, type, title, body, order_id, channel)
  values
    (new.buyer_id,  'order_status', 'Захиалгын төлөв шинэчлэгдлээ', new.status, new.id, 'in_app'),
    (new.seller_id, 'order_status', 'Захиалгын төлөв шинэчлэгдлээ', new.status, new.id, 'in_app');
  return null;
end;
$$;

create trigger trg_notify_order_status after update on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.notify_order_status();

create or replace function public.notify_new_message()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare o public.orders; recipient uuid;
begin
  select * into o from public.orders where id = new.order_id;
  recipient := case when new.sender_id = o.buyer_id then o.seller_id else o.buyer_id end;
  insert into public.notifications(user_id, type, title, body, order_id, channel)
  values (recipient, 'message', 'Шинэ мессеж', left(new.body, 80), new.order_id, 'in_app');
  return null;
end;
$$;

create trigger trg_notify_message after insert on public.messages
  for each row execute function public.notify_new_message();

-- ───────────── 2.1 / 2.6 Админ RPC ─────────────
-- Маргаан шийдвэрлэх (release/refund/reject) + захиалгын төлөв синк
create or replace function public.admin_resolve_dispute(p_dispute_id uuid, p_outcome text, p_note text)
returns void
language plpgsql security definer set search_path = public
as $$
declare d public.disputes;
begin
  if not public.is_admin() then raise exception 'зөвхөн админ'; end if;
  if p_outcome not in ('released','refunded','rejected') then raise exception 'буруу outcome'; end if;

  select * into d from public.disputes where id = p_dispute_id for update;
  if not found then raise exception 'маргаан олдсонгүй'; end if;

  update public.disputes
     set status = p_outcome::public.dispute_status,
         admin_note = p_note,
         resolved_by = public.current_user_id(),
         resolved_at = now()
   where id = p_dispute_id;

  if p_outcome = 'released' then
    update public.orders set status = 'completed' where id = d.order_id and status = 'disputed';
    update public.listings set status = 'sold'
      where id = (select listing_id from public.orders where id = d.order_id);
  elsif p_outcome = 'refunded' then
    update public.orders set status = 'refunded' where id = d.order_id and status = 'disputed';
    update public.listings set status = 'active'
      where id = (select listing_id from public.orders where id = d.order_id) and status = 'reserved';
  elsif p_outcome = 'rejected' then
    update public.orders set status = 'inspecting' where id = d.order_id and status = 'disputed';
  end if;
end;
$$;

-- Гар payout бүртгэх — payouts журнал + orders.payout_status='paid_out' (trades_count bump)
create or replace function public.admin_record_payout(
  p_order_id uuid, p_method text, p_bank_account text, p_external_txn_ref text)
returns void
language plpgsql security definer set search_path = public
as $$
declare o public.orders;
begin
  if not public.is_admin() then raise exception 'зөвхөн админ'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'захиалга олдсонгүй'; end if;
  if o.status <> 'completed' then raise exception 'зөвхөн completed захиалгад payout (одоо: %)', o.status; end if;
  if o.payout_status = 'paid_out' then raise exception 'аль хэдийн олгосон'; end if;

  insert into public.payouts(order_id, recipient_id, amount, fee_deducted, net_amount,
                             method, bank_account, external_txn_ref, status, paid_by, paid_at)
  values (o.id, o.seller_id, o.amount, o.fee, o.amount - o.fee,
          p_method, p_bank_account, p_external_txn_ref, 'paid_out', public.current_user_id(), now());

  update public.orders set payout_status = 'paid_out' where id = o.id;
end;
$$;

-- Зарагчийг баталгаажуулах тэмдэг олгох/буцаах
create or replace function public.admin_set_verified(p_user_id uuid, p_verified boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'зөвхөн админ'; end if;
  perform set_config('app.allow_trust_update', '1', true);
  update public.users set is_verified = p_verified where id = p_user_id;
end;
$$;

grant execute on function public.admin_resolve_dispute(uuid, text, text) to authenticated;
grant execute on function public.admin_record_payout(uuid, text, text, text) to authenticated;
grant execute on function public.admin_set_verified(uuid, boolean) to authenticated;
