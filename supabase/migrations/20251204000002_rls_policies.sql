-- RLS Policies for leads table

alter table public.leads enable row level security;

-- Who can view leads:
-- Admins see everything in their tenant
-- Counselors see their own leads + leads from their teams
create policy "leads_read_access"
on public.leads for select using (
  tenant_id = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::uuid
  and (
    -- admins get full tenant access
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'admin'
    or
    -- counselors see leads they own
    owner_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::uuid
    or
    -- counselors see leads assigned to their teams
    team_id in (
      select team_id from public.user_teams
      where user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::uuid
    )
  )
);

-- Who can create leads:
-- Admins and counselors can create leads in their own tenant
create policy "leads_create_access"
on public.leads for insert with check (
  current_setting('request.jwt.claims', true)::jsonb->>'role' in ('admin', 'counselor')
  and tenant_id = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::uuid
);
