-- 0006 — Storage bucket ба policy
-- Build Plan 1.7: listing-images (public read, эзэн л upload), credentials (private).

-- Bucket-ууд
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('credentials', 'credentials', false, 5242880, null)
on conflict (id) do nothing;

-- listing-images: нийтэд унших боломжтой (зар харагдах ёстой)
create policy "listing-images public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'listing-images');

-- Зам: <listing_id>/<filename> — зарагч зөвхөн өөрийн listing-ийн фолдер руу байршуулна
create policy "listing-images owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] in (
      select id::text from public.listings where seller_id = public.current_user_id()
    ));

create policy "listing-images owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] in (
      select id::text from public.listings where seller_id = public.current_user_id()
    ));

create policy "listing-images owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] in (
      select id::text from public.listings where seller_id = public.current_user_id()
    ));

-- credentials bucket: private. Зөвхөн тухайн захиалгын buyer/seller/admin хандана.
-- Зам: <order_id>/<filename>
create policy "credentials order party read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'credentials'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select o.id::text from public.orders o
        where o.buyer_id = public.current_user_id()
           or o.seller_id = public.current_user_id()
      )));
-- Бичих нь Edge Function/service_role-оор (шифрлэлттэй) — энд insert policy өгөхгүй.
