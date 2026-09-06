drop policy if exists "Public can read published listings" on public.listings;

create policy "Public can read available listings"
on public.listings for select to anon, authenticated
using (status in ('published', 'reserved'));

drop policy if exists "Public can read images of visible listings" on public.listing_images;

create policy "Public can read images of available listings"
on public.listing_images for select to anon, authenticated
using (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
      and listings.status in ('published', 'reserved')
  )
);

comment on policy "Public can read available listings" on public.listings
is 'Sold, archived and draft listings are hidden from unrelated marketplace users.';
