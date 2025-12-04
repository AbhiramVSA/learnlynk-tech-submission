import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(supabaseUrl, serviceKey);

const ALLOWED_TYPES = ["call", "email", "review"] as const;

interface TaskInput {
  application_id: string;
  task_type: string;
  due_at: string;
}

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { application_id, task_type, due_at } = (await req.json()) as Partial<TaskInput>;

    // validate inputs
    if (!application_id || !isUuid(application_id)) {
      return jsonResponse({ error: "Invalid or missing application_id" }, 400);
    }

    if (!task_type || !ALLOWED_TYPES.includes(task_type as any)) {
      return jsonResponse({ error: `task_type must be one of: ${ALLOWED_TYPES.join(", ")}` }, 400);
    }

    if (!due_at) {
      return jsonResponse({ error: "due_at is required" }, 400);
    }

    const dueDate = new Date(due_at);
    if (isNaN(dueDate.getTime())) {
      return jsonResponse({ error: "due_at must be a valid timestamp" }, 400);
    }

    if (dueDate <= new Date()) {
      return jsonResponse({ error: "due_at must be in the future" }, 400);
    }

    // get tenant from application
    const { data: app, error: appErr } = await db
      .from("applications")
      .select("tenant_id")
      .eq("id", application_id)
      .single();

    if (appErr || !app) {
      return jsonResponse({ error: "Application not found" }, 400);
    }

    // create the task
    const { data: task, error: insertErr } = await db
      .from("tasks")
      .insert({
        application_id,
        tenant_id: app.tenant_id,
        type: task_type,
        due_at: dueDate.toISOString(),
        status: "open",
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Failed to insert task:", insertErr);
      return jsonResponse({ error: "Failed to create task" }, 500);
    }

    return jsonResponse({ success: true, task_id: task.id });

  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
