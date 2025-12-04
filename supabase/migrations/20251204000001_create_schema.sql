-- Schema for LearnLynk CRM
-- Tables: leads, applications, tasks

create extension if not exists "pgcrypto";

-- Leads table
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  owner_id uuid not null,
  team_id uuid,
  email text,
  phone text,
  full_name text,
  stage text not null default 'new',
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_tenant_idx on public.leads(tenant_id);
create index if not exists leads_owner_idx on public.leads(owner_id);
create index if not exists leads_stage_idx on public.leads(stage);
create index if not exists leads_tenant_owner_idx on public.leads(tenant_id, owner_id);
create index if not exists leads_tenant_stage_idx on public.leads(tenant_id, stage);


-- Applications table
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  lead_id uuid not null references public.leads(id) on delete cascade,
  program_id uuid,
  intake_id uuid,
  stage text not null default 'inquiry',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists apps_tenant_idx on public.applications(tenant_id);
create index if not exists apps_lead_idx on public.applications(lead_id);
create index if not exists apps_tenant_lead_idx on public.applications(tenant_id, lead_id);


-- Tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  application_id uuid not null references public.applications(id) on delete cascade,
  title text,
  type text not null check (type in ('call', 'email', 'review')),
  status text not null default 'open',
  due_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint valid_due_date check (due_at >= created_at)
);

create index if not exists tasks_tenant_idx on public.tasks(tenant_id);
create index if not exists tasks_due_idx on public.tasks(due_at);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_tenant_due_idx on public.tasks(tenant_id, due_at);
create index if not exists tasks_lookup_idx on public.tasks(tenant_id, due_at, status);

-- user_teams junction table (needed for RLS)
create table if not exists public.user_teams (
  user_id uuid not null,
  team_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, team_id)
);
