import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PricingRequestData {
  name: string;
  email: string;
  company: string;
  phone?: string;
  config: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const data: PricingRequestData = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Email to admin
    const adminEmail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CarboScan <contact@carboscan.io>",
        to: ["kameltalbi.tn@gmail.com"],
        subject: `Nouvelle demande de prix - ${data.company}`,
        html: `
          <h2>📊 Nouvelle demande de prix CarboScan</h2>
          <div style="margin: 20px 0; padding: 20px; border-left: 4px solid #0E7C66; background-color: #f0fdf4;">
            <h3>Contact</h3>
            <p><strong>Nom :</strong> ${data.name}</p>
            <p><strong>Email :</strong> ${data.email}</p>
            <p><strong>Entreprise :</strong> ${data.company}</p>
            ${data.phone ? `<p><strong>Téléphone :</strong> ${data.phone}</p>` : ""}
          </div>
          <div style="margin: 20px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
            <h3>Configuration demandée</h3>
            <p>${data.config.replace(/\n/g, "<br>")}</p>
          </div>
          <p style="color: #6B7280; font-size: 12px;">Demande soumise via la page tarifs de CarboScan.</p>
        `,
      }),
    });

    if (!adminEmail.ok) {
      const err = await adminEmail.text();
      console.error("Admin email error:", err);
      throw new Error(`Failed to send admin email: ${err}`);
    }

    // Confirmation email to user
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CarboScan <contact@carboscan.io>",
        to: [data.email],
        subject: "Votre demande de prix CarboScan - Confirmation",
        html: `
          <h2>Merci pour votre intérêt !</h2>
          <p>Bonjour ${data.name},</p>
          <p>Nous avons bien reçu votre demande de prix pour <strong>${data.company}</strong>.</p>
          <div style="margin: 20px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px;">
            <p>Notre équipe analyse votre configuration et vous enverra une offre personnalisée sous <strong>48 heures</strong>.</p>
          </div>
          <p>Cordialement,<br>L'équipe CarboScan</p>
        `,
      }),
    });

    console.log("Pricing notification emails sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-pricing-request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
