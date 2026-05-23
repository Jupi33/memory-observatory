-- Demo Supabase schema for Memory Observatory.
-- This intentionally supports a no-login, gift-site editing flow.
-- For sensitive production data, start from supabase-schema.production-template.sql
-- and require authenticated editor access before allowing writes.

create table if not exists public.memories (
  id text primary key,
  title text not null,
  description text not null default '',
  author text not null default 'Demo',
  chapter text not null default 'memory-room',
  category text not null default 'daily',
  era text not null default 'present',
  place text not null default 'Sin lugar',
  importance integer not null default 1,
  media_url text not null,
  media_type text not null default 'image',
  mood text not null default '#ff5c8a',
  linked_memory_id text,
  date text,
  sort_order integer not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.responses (
  id text primary key,
  memory_id text not null references public.memories(id) on delete cascade,
  author text not null default 'Demo',
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.memories enable row level security;
alter table public.responses enable row level security;

create index if not exists memories_sort_order_idx on public.memories(sort_order);
create index if not exists memories_date_idx on public.memories(date);
create index if not exists responses_memory_id_idx on public.responses(memory_id);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'memories' and policyname = 'Public memories are readable'
  ) then
    create policy "Public memories are readable"
    on public.memories for select
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'memories' and policyname = 'Public memories are writable for gift site'
  ) then
    create policy "Public memories are writable for gift site"
    on public.memories for insert
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'memories' and policyname = 'Public memories are editable for gift site'
  ) then
    create policy "Public memories are editable for gift site"
    on public.memories for update
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'memories' and policyname = 'Public memories are deletable for gift site'
  ) then
    create policy "Public memories are deletable for gift site"
    on public.memories for delete
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'responses' and policyname = 'Public responses are readable'
  ) then
    create policy "Public responses are readable"
    on public.responses for select
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'responses' and policyname = 'Public responses are writable for gift site'
  ) then
    create policy "Public responses are writable for gift site"
    on public.responses for insert
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'responses' and policyname = 'Public responses are editable for gift site'
  ) then
    create policy "Public responses are editable for gift site"
    on public.responses for update
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'responses' and policyname = 'Public responses are deletable for gift site'
  ) then
    create policy "Public responses are deletable for gift site"
    on public.responses for delete
    using (true);
  end if;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memory-media',
  'memory-media',
  true,
  104857600,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public gift media is uploadable'
  ) then
    create policy "Public gift media is uploadable"
    on storage.objects for insert
    with check (bucket_id = 'memory-media');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public gift media is replaceable'
  ) then
    create policy "Public gift media is replaceable"
    on storage.objects for update
    using (bucket_id = 'memory-media')
    with check (bucket_id = 'memory-media');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public gift media is removable'
  ) then
    create policy "Public gift media is removable"
    on storage.objects for delete
    using (bucket_id = 'memory-media');
  end if;
end
$$;
