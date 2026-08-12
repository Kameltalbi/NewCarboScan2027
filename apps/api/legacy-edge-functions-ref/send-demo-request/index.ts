import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DemoRequestData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  phone: string;
  preferredTime: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const demoData: DemoRequestData = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Send email to kameltalbi.tn@gmail.com
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CarboScan <contact@carboscan.io>",
        to: ["kameltalbi.tn@gmail.com"],
        subject: `Nouvelle demande de démo - ${demoData.company}`,
        html: `
          <h2>Nouvelle demande de démonstration</h2>
          <div style="margin: 20px 0; padding: 20px; border-left: 4px solid #10b981; background-color: #f0fdf4;">
            <h3>Informations du contact :</h3>
            <p><strong>Nom :</strong> ${demoData.firstName} ${demoData.lastName}</p>
            <p><strong>Email :</strong> ${demoData.email}</p>
            <p><strong>Entreprise :</strong> ${demoData.company}</p>
            <p><strong>Téléphone :</strong> ${demoData.phone}</p>
            <p><strong>Créneau préféré :</strong> ${demoData.preferredTime}</p>
            ${demoData.message ? `<p><strong>Message :</strong> ${demoData.message}</p>` : ''}
          </div>
          <p>Cette demande a été soumise via le formulaire de démonstration gratuite sur le site CarboTrack.</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Email send error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    // Send confirmation email to the user
    const confirmationResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CarboScan <contact@carboscan.io>",
        to: [demoData.email],
        subject: "Confirmation de votre demande de démonstration - CarboTrack",
        html: `
          <h2>Merci pour votre demande de démonstration !</h2>
          <p>Bonjour ${demoData.firstName},</p>
          <p>Nous avons bien reçu votre demande de démonstration pour <strong>${demoData.company}</strong>.</p>
          <div style="margin: 20px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
            <h3>Récapitulatif de votre demande :</h3>
            <p><strong>Créneau préféré :</strong> ${demoData.preferredTime}</p>
            <p><strong>Téléphone :</strong> ${demoData.phone}</p>
            ${demoData.message ? `<p><strong>Votre message :</strong> ${demoData.message}</p>` : ''}
          </div>
          <p>Notre équipe vous contactera dans les plus brefs délais pour organiser votre démonstration personnalisée.</p>
          <p>Cordialement,<br>L'équipe CarboTrack</p>
        `,
      }),
    });

    console.log("Emails sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-demo-request function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
