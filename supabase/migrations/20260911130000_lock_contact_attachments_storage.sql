-- This shared Supabase project ("Sharpable Business") already has two
-- pre-existing, unscoped PERMISSIVE policies on storage.objects (likely
-- serving a different app's bucket in this same project):
--   "Allow public uploads 187cpx3_0" (public, INSERT, with_check: true)
--   "Allow public reads 187cpx3_0"   (public, SELECT, qual: true)
-- Because Postgres RLS OR's permissive policies together, those two grant
-- the anon key full read/write access to *every* bucket, including
-- contact-attachments, regardless of that bucket's own public:false flag.
--
-- A RESTRICTIVE policy is AND'd on top of permissive ones -- Postgres
-- denies access if a restrictive policy's check fails, even when a
-- permissive policy would otherwise allow it. This excludes
-- contact-attachments from those blanket grants for every operation, not
-- just the two the existing permissive policies happen to cover today.
--
-- service_role (used by the Edge Function) is unaffected: Supabase's
-- service_role has BYPASSRLS and skips RLS checks entirely, so it never
-- evaluates this policy at all.
create policy "Restrict contact-attachments to service role only"
  on storage.objects
  as restrictive
  for all
  to public
  using (bucket_id <> 'contact-attachments')
  with check (bucket_id <> 'contact-attachments');
