import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChatbotLeadData {
  email: string;
  company_name?: string;
  phone?: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ChatbotLeadData = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Envoyer notification à l'admin
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CarboScan <contact@carboscan.io>",
        to: ["kameltalbi.tn@gmail.com"],
        subject: `🤖 Nouveau lead chatbot - ${data.email}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981, #0F172A); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🤖 Nouveau contact via le chatbot IA</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
              <p style="color: #1F2937; font-size: 16px;">Un visiteur a demandé à être contacté via le chatbot CarboScan IA.</p>
              
              <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 4px; margin: 20px 0;">
                <h3 style="color: #1F2937; margin-top: 0;">Informations du contact :</h3>
                <p style="color: #4B5563; margin: 8px 0;"><strong>Email :</strong> ${data.email}</p>
                ${data.company_name ? `<p style="color: #4B5563; margin: 8px 0;"><strong>Entreprise :</strong> ${data.company_name}</p>` : ''}
                ${data.phone ? `<p style="color: #4B5563; margin: 8px 0;"><strong>Téléphone :</strong> ${data.phone}</p>` : ''}
                <p style="color: #4B5563; margin: 8px 0;"><strong>Message :</strong></p>
                <div style="background-color: #ffffff; padding: 12px; border-radius: 4px; margin-top: 8px;">
                  <p style="color: #1F2937; margin: 0; white-space: pre-wrap;">${data.message}</p>
                </div>
              </div>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-weight: 600;">⚡ Action requise</p>
                <p style="color: #78350f; margin: 8px 0 0 0;">Contactez ce lead rapidement pour maximiser les chances de conversion.</p>
              </div>

              <div style="text-align: center; margin: 24px 0;">
                <a href="https://supabase.com/dashboard/project/jhucjukyvlilhgjbtlkt/editor" 
                   style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Voir dans Supabase →
                </a>
              </div>
            </div>
            <div style="padding: 20px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} CarboScan - Notification automatique du chatbot IA
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const err = await emailResponse.text();
      console.error("Notification email error:", err);
      throw new Error(`Failed to send notification email: ${err}`);
    }

    console.log("Chatbot lead notification sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-chatbot-lead-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
