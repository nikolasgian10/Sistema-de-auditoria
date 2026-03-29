const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, name, role, minifabrica } = await req.json();

    if (!email || !password || !name || !role) {
      return new Response(
        JSON.stringify({ error: "Email, senha, nome e role obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhb3d3Y2xhZmV6bnJtb2V2a2ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MTQxNiwiZXhwIjoyMDkwMzI3NDE2fQ.uChPOB1xeGZdujzjo77qeGX7bMiaK3vhjClGF0NUxgM";
    console.log("URL:", SUPABASE_URL);
    console.log("KEY:", SERVICE_KEY);

    const createUserRes = await fetch(
  "https://daowwclafeznrmoevkjm.supabase.co/auth/v1/admin/users",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhb3d3Y2xhZmV6bnJtb2V2a2ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MTQxNiwiZXhwIjoyMDkwMzI3NDE2fQ.uChPOB1xeGZdujzjo77qeGX7bMiaK3vhjClGF0NUxgM",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhb3d3Y2xhZmV6bnJtb2V2a2ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MTQxNi," +
        "InZXhwIjoyMDkwMzI3NDE2fQ.uChPOB1xeGZdujzjo77qeGX7bMiaK3vhjClGF0NUxgM",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    }),
  }
);
    if (!createUserRes.ok) {
      const error = await createUserRes.json();
      return new Response(
        JSON.stringify({ error: error.message || "Erro ao criar usuário" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userData = await createUserRes.json();
    const userId = userData.id;

    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "apikey": SERVICE_KEY,
      },
      body: JSON.stringify({ name, minifabrica: minifabrica || null }),
    });

    await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "apikey": SERVICE_KEY,
      },
      body: JSON.stringify({ user_id: userId, role }),
    });

    return new Response(
      JSON.stringify({ success: true, id: userId, email, name }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});