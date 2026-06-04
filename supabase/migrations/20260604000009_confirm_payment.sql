-- 0009 — Phase 3: QPay төлбөр баталгаажуулах (idempotent, НИЙЛБЭР дүнгээр).
-- Build Plan 3.5/3.6.
-- Зарчим:
--   • Idempotency нь payment_id ТҮВШИНД (нэг invoice олон payment байж болно).
--   • Шийдвэр нь НЭГ payment мөр биш, БҮХ PAID payment-ийн НИЙЛБЭР дүнгээр (escrow-д бүрэн
--     төлөлт шаардлагатай). Хэсэгчилсэн төлбөр → 'created' хэвээр (дараагийн callback нэгтгэнэ),
--     илүү төлбөр → автомат маргаан, яг тэнцүү → 'paid'.
--   • Зөвхөн service_role (Edge Function)-оос дуудагдана (доор explicit revoke).
create or replace function public.confirm_payment(
  p_order_id        uuid,
  p_qpay_invoice_id text,
  p_paid_total      bigint,
  p_payments        jsonb,   -- [{payment_id, amount, status}] — idempotent бүртгэлд
  p_raw             jsonb
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  o public.orders;
  p jsonb;
begin
  -- 1) Бүх PAID payment-ийг idempotent-ээр бүртгэх (payment_id давхцлыг чимээгүй алгасах).
  --    status-ийг бодит утгаар хадгална (always 'PAID' БИШ) — ledger/audit зөв байх.
  if p_payments is not null then
    for p in select value from jsonb_array_elements(p_payments) as t(value)
    loop
      insert into public.payment_events(order_id, qpay_payment_id, qpay_invoice_id, amount, status, raw_payload)
      values (
        p_order_id,
        p->>'payment_id',
        p_qpay_invoice_id,
        coalesce(nullif(p->>'amount','')::bigint, 0),
        coalesce(p->>'status', 'PAID'),
        p
      )
      on conflict (qpay_payment_id) do nothing;
    end loop;
  end if;

  -- 2) Захиалгыг түгжиж НИЙТ төлсөн дүнгээр шийдэх (compare-and-set).
  select * into o from public.orders where id = p_order_id for update;
  if not found then return 'order_not_found'; end if;
  if o.status <> 'created' then return 'noop'; end if;  -- аль хэдийн төлсөн/бусад төлөв

  if p_paid_total < o.amount then
    -- хэсэгчилсэн төлбөр: created хэвээр үлдээж, дараагийн callback/reconcile нийлбэрийг дахин үнэлнэ
    return 'underpaid';
  elsif p_paid_total > o.amount then
    update public.orders set status = 'disputed' where id = o.id;
    insert into public.disputes(order_id, opened_by, reason)
    values (o.id, o.buyer_id, 'Илүү төлбөр: ' || p_paid_total || ' > ' || o.amount || ' (автомат)');
    return 'overpaid';
  else
    update public.orders
       set status = 'paid',
           qpay_invoice_id = coalesce(qpay_invoice_id, p_qpay_invoice_id)
     where id = o.id;
    return 'paid';
  end if;
end;
$$;

-- Хамгаалалт (defense-in-depth): config drift-ээс үл хамаарч энэ функцийг
-- зөвхөн service_role дуудна — анхдагч PUBLIC EXECUTE-ийг шууд цуцална.
revoke all on function public.confirm_payment(uuid, text, bigint, jsonb, jsonb) from public, anon, authenticated;
