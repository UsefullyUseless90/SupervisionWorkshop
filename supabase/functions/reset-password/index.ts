import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { matricule } = body as { matricule: string };

    if (!matricule) {
      return new Response(
        JSON.stringify({ error: "Matricule requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the profile by matricule to get the user's email
    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("id, email")
      .eq("matricule", matricule)
      .maybeSingle();

    if (profileErr || !profile) {
      // Don't reveal whether the matricule exists — return success anyway
      return new Response(
        JSON.stringify({ success: true, message: "Si le matricule existe, un email a été envoyé." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send a password recovery email to the user's email address
    const { error: resetErr } = await adminClient.auth.resetPasswordForEmail(
      profile.email,
      { redirectTo: `${req.headers.get("origin") || ""}/` }
    );

    if (resetErr) {
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'envoi de l'email de réinitialisation." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email de réinitialisation envoyé." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
