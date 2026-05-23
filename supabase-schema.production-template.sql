-- Production-oriented Supabase template for Memory Observatory.
-- This file is intentionally stricter than supabase-schema.sql.
-- It assumes Supabase Auth is enabled and only authenticated editors can write.

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

create policy "Published memories are readable"
on public.memories for select
using (hidden = false);

create policy "Published responses are readable"
on public.responses for select
using (
  exists (
    select 1
    from public.memories
    where memories.id = responses.memory_id
      and memories.hidden = false
  )
);

create policy "Authenticated editors can insert memories"
on public.memories for insert
to authenticated
with check (true);

create policy "Authenticated editors can update memories"
on public.memories for update
to authenticated
using (true)
with check (true);

create policy "Authenticated editors can delete memories"
on public.memories for delete
to authenticated
using (true);

create policy "Authenticated editors can insert responses"
on public.responses for insert
to authenticated
with check (true);

create policy "Authenticated editors can update responses"
on public.responses for update
to authenticated
using (true)
with check (true);

create policy "Authenticated editors can delete responses"
on public.responses for delete
to authenticated
using (true);

-- Storage policies should mirror the same authenticated-editor model.
-- Create the bucket in the Supabase dashboard or through migrations, then scope
-- insert/update/delete policies to authenticated editor sessions.

