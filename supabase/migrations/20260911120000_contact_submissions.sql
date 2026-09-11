create table if not exists public.contact_submissions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  company text,
  message text not null,
  attachment_paths text[] not null default '{}',
  ip_address text,
  status text not null default 'new',
  constraint contact_submissions_name_length check (char_length(name) <= 200),
  constraint contact_submissions_email_length check (char_length(email) <= 320),
  constraint contact_submissions_phone_length check (phone is null or char_length(phone) <= 40),
  constraint contact_submissions_company_length check (company is null or char_length(company) <= 200),
  constraint contact_submissions_message_length check (char_length(message) <= 5000)
);

create index if not exists contact_submissions_ip_created_at_idx
  on public.contact_submissions (ip_address, created_at desc);

-- RLS on, deliberately zero policies for anon/authenticated. Only the
-- service-role key (used exclusively inside the Edge Function) bypasses
-- RLS by design in Postgres/Supabase, so it's the only way in.
alter table public.contact_submissions enable row level security;

-- Defense in depth: also revoke the table-level grants Supabase's default
-- schema privileges hand out to anon/authenticated, on top of RLS.
revoke all on public.contact_submissions from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('contact-attachments', 'contact-attachments', false)
on conflict (id) do nothing;

-- No storage.objects policies added for this bucket — Supabase's storage
-- RLS defaults to deny, so anon/authenticated get zero access by default.
