import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GuideRequestData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  sector: string;
  guideUrl: string;
  language?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: GuideRequestData = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Fetch the PDF from Supabase Storage
    console.log("Fetching PDF from:", data.guideUrl);
    const pdfResponse = await fetch(data.guideUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(
      new Uint8Array(pdfBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    console.log(`PDF fetched successfully, size: ${pdfBuffer.byteLength} bytes`);

    const isEnglish = data.language === "en";
    const pdfFilename = isEnglish
      ? "Carbon_Footprint_Calculation_Guide_CarboScan.pdf"
      : "Guide_Calcul_Bilan_Carbone_CarboScan.pdf";

    // Send guide email with PDF attachment
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CarboScan <contact@carboscan.io>",
        to: [data.email],
        subject: isEnglish
          ? "Your free guide - How to calculate your carbon footprint"
          : "Votre guide gratuit - Comment calculer votre bilan carbone",
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBase64,
          },
        ],
        html: isEnglish
          ? `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1ABC9C, #0F172A); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📊 Your guide is ready!</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
              <p style="color: #1F2937; font-size: 16px;">Hello ${data.firstName},</p>
              <p style="color: #4B5563; line-height: 1.6;">
                Thank you for your interest in carbon footprint calculation! Please find attached your comprehensive <strong>20-page guide</strong> to master the key steps.
              </p>
              <div style="background-color: #f0fdf4; border-left: 4px solid #1ABC9C; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <p style="color: #1F2937; margin: 0; font-weight: 600;">What you will learn:</p>
                <ul style="color: #4B5563; margin: 8px 0 0 0; padding-left: 20px;">
                  <li>ISO 14064 & GHG Protocol methodology</li>
                  <li>Understanding Scopes 1, 2 and 3</li>
                  <li>Data collection checklist</li>
                  <li>Concrete cases by industry sector</li>
                </ul>
              </div>
              <p style="color: #4B5563; line-height: 1.6;">
                Need to go further? <strong>CarboScan</strong> helps you calculate and reduce your carbon footprint.
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="https://carboscan.io" style="color: #1ABC9C; font-weight: 600; text-decoration: none;">
                  Discover CarboScan →
                </a>
              </div>
            </div>
            <div style="padding: 20px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} CarboScan - Carbon Management Platform
              </p>
            </div>
          </div>
        `
          : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1ABC9C, #0F172A); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📊 Votre guide est prêt !</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
              <p style="color: #1F2937; font-size: 16px;">Bonjour ${data.firstName},</p>
              <p style="color: #4B5563; line-height: 1.6;">
                Merci pour votre intérêt pour le calcul de bilan carbone ! Vous trouverez en pièce jointe votre guide complet de <strong>20 pages</strong> pour maîtriser les étapes clés.
              </p>
              <div style="background-color: #f0fdf4; border-left: 4px solid #1ABC9C; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <p style="color: #1F2937; margin: 0; font-weight: 600;">Ce que vous allez apprendre :</p>
                <ul style="color: #4B5563; margin: 8px 0 0 0; padding-left: 20px;">
                  <li>Méthodologie ISO 14064 & GHG Protocol</li>
                  <li>Comprendre les Scopes 1, 2 et 3</li>
                  <li>Checklist des données à collecter</li>
                  <li>Cas concrets par secteur d'activité</li>
                </ul>
              </div>
              <p style="color: #4B5563; line-height: 1.6;">
                Besoin d'aller plus loin ? <strong>CarboScan</strong> vous accompagne dans le calcul et la réduction de votre empreinte carbone.
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="https://carboscan.io" style="color: #1ABC9C; font-weight: 600; text-decoration: none;">
                  Découvrir CarboScan →
                </a>
              </div>
            </div>
            <div style="padding: 20px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} CarboScan - Plateforme de gestion carbone
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const err = await emailResponse.text();
      console.error("Guide email error:", err);
      throw new Error(`Failed to send guide email: ${err}`);
    }

    // Notify admin
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CarboScan <contact@carboscan.io>",
        to: ["kameltalbi.tn@gmail.com"],
        subject: `Nouveau téléchargement guide - ${data.firstName} ${data.lastName}`,
        html: `
          <h2>📥 Nouveau téléchargement du guide</h2>
          <div style="padding: 16px; border-left: 4px solid #1ABC9C; background-color: #f0fdf4;">
            <p><strong>Nom :</strong> ${data.lastName} ${data.firstName}</p>
            <p><strong>Email :</strong> ${data.email}</p>
            <p><strong>Téléphone :</strong> ${data.phone || 'Non renseigné'}</p>
            <p><strong>Secteur :</strong> ${data.sector}</p>
          </div>
        `,
      }),
    });

    console.log("Guide emails sent successfully with attachment");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-guide-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
