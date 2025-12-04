# LearnLynk – Technical Assessment 

Thanks for taking the time to complete this assessment. The goal is to understand how you think about problems and how you structure real project work. This is a small, self-contained exercise that should take around **2–3 hours**. It’s completely fine if you don’t finish everything—just note any assumptions or TODOs.

We use:

- **Supabase Postgres**
- **Supabase Edge Functions (TypeScript)**
- **Next.js + TypeScript**

You may use your own free Supabase project.

---

## Overview

There are four technical tasks:

1. Database schema — `backend/schema.sql`  
2. RLS policies — `backend/rls_policies.sql`  
3. Edge Function — `backend/edge-functions/create-task/index.ts`  
4. Next.js page — `frontend/pages/dashboard/today.tsx`  

There is also a short written question about Stripe in this README.

Feel free to use Supabase/PostgreSQL docs, or any resource you normally use.

---

## Task 1 — Database Schema

File: `backend/schema.sql`

Create the following tables:

- `leads`  
- `applications`  
- `tasks`  

Each table should include standard fields:

```sql
id uuid primary key default gen_random_uuid(),
tenant_id uuid not null,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Additional requirements:

- `applications.lead_id` → FK to `leads.id`  
- `tasks.application_id` → FK to `applications.id`  
- `tasks.type` should only allow: `call`, `email`, `review`  
- `tasks.due_at >= tasks.created_at`  
- Add reasonable indexes for typical queries:  
  - Leads: `tenant_id`, `owner_id`, `stage`  
  - Applications: `tenant_id`, `lead_id`  
  - Tasks: `tenant_id`, `due_at`, `status`  

---

## Task 2 — Row-Level Security

File: `backend/rls_policies.sql`

We want:

- Counselors can see:
  - Leads they own, or  
  - Leads assigned to any team they belong to  
- Admins can see all leads belonging to their tenant

Assume the existence of:

```
users(id, tenant_id, role)
teams(id, tenant_id)
user_teams(user_id, team_id)
```

JWT contains:

- `user_id`
- `role`
- `tenant_id`

Tasks:

1. Enable RLS on `leads`  
2. Write a **SELECT** policy enforcing the rules above  
3. Write an **INSERT** policy that allows counselors/admins to add leads under their tenant  

---

## Task 3 — Edge Function: create-task

File: `backend/edge-functions/create-task/index.ts`

Write a simple POST endpoint that:

### Input:
```json
{
  "application_id": "uuid",
  "task_type": "call",
  "due_at": "2025-01-01T12:00:00Z"
}
```

### Requirements:
- Validate:
  - `task_type` is `call`, `email`, or `review`
  - `due_at` is a valid *future* timestamp  
- Insert a row into `tasks` using the service role key  
- Return:

```json
{ "success": true, "task_id": "..." }
```

On validation error → return **400**  
On internal errors → return **500**

---

## Task 4 — Frontend Page: `/dashboard/today`

File: `frontend/pages/dashboard/today.tsx`

Build a small page that:

- Fetches tasks due **today** (status ≠ completed)  
- Uses the provided Supabase client  
- Displays:  
  - type  
  - application_id  
  - due_at  
  - status  
- Adds a “Mark Complete” button that updates the task in Supabase  

---

## Task 5 — Stripe Checkout (Written Answer)

Add a section titled:

```
## Stripe Answer
```

Write **8–12 lines** describing how you would implement a Stripe Checkout flow for an application fee, including:

- When you insert a `payment_requests` row  
- When you call Stripe  
- What you store from the checkout session  
- How you handle webhooks  
- How you update the application after payment succeeds  

---

## Submission

1. Push your work to a public GitHub repo.  
2. Add your Stripe answer at the bottom of this file.  
3. Share the link.

Good luck.

---

## Stripe Answer

- I would start by inserting a pending record into my payment_requests table before I even ping Stripe's API; you need that local state just in case the user closes the window or the network hangs.

- Next, I hit the v1/checkout/sessions endpoint with mode='payment', making sure to pass the application_fee_amount inside the payment_intent_data object so the split is handled automatically by Connect.

- Once I get the response, I grab session ID and update my local record, that ID is the critical for reconciliation later and only then do I redirect the user's browser to the hosted Checkout page.

- For fulfillment, I would not trust the client-side success redirect. instead, I set up a webhook listener specifically for the checkout.session.completed event to act as the single source of truth.

- When that webhook fires, I verify the signature to ensure it's actually from Stripe, then use the session ID from the payload to look up the original pending request and confirm the payment status is valid.

- Finally, I update the local database status to succeeded, capture the payment_intent_id for potential refunds down the line, and trigger the actual business logic to unlock the feature for the user.
