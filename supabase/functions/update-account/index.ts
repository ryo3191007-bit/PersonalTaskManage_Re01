import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: { error: string } | { success: true }, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // Verify the calling user via anon client
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: userError } = await anonClient.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json() as { email?: string; password?: string };
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const updates: { email?: string; password?: string } = {};
  if (typeof body.email === "string" && body.email.trim()) {
    const email = body.email.trim();
    if (!emailPattern.test(email)) {
      return jsonResponse({ error: "Invalid email format" }, 400);
    }
    updates.email = email;
  }
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 6) {
      return jsonResponse({ error: "Password must be at least 6 characters" }, 400);
    }
    updates.password = body.password;
  }
  if (Object.keys(updates).length === 0) {
    return jsonResponse({ error: "No update fields provided" }, 400);
  }

  // Use service role admin client to bypass email confirmation
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await adminClient.auth.admin.updateUserById(user.id, updates);

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ success: true });
});
