// Edge Function pour envoyer des notifications par email
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

interface NotificationEmail {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(email: NotificationEmail): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'CarboScan <notifications@carboscan.tn>',
        to: email.to,
        subject: email.subject,
        html: email.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { notification_id, user_email } = await req.json();

    if (!notification_id || !user_email) {
      return new Response(
        JSON.stringify({ error: 'notification_id and user_email are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Récupérer la notification
    const { data: notification, error: notifError } = await supabaseClient
      .from('collect_notifications')
      .select('*')
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      return new Response(
        JSON.stringify({ error: 'Notification not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Récupérer les informations de la session
    let sessionName = 'Session de collecte';
    if (notification.session_id) {
      const { data: session } = await supabaseClient
        .from('collect_sessions')
        .select('name')
        .eq('id', notification.session_id)
        .single();
      if (session) {
        sessionName = session.name;
      }
    }

    // Construire l'URL d'action
    const actionUrl = notification.action_url
      ? `${Deno.env.get('APP_URL') || 'https://carboscan.tn'}${notification.action_url}`
      : `${Deno.env.get('APP_URL') || 'https://carboscan.tn'}/collect`;

    // Générer le HTML de l'email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>CarboScan Collect</h1>
            </div>
            <div class="content">
              <h2>${notification.title}</h2>
              <p>${notification.message}</p>
              ${notification.session_name ? `<p><strong>Session:</strong> ${notification.session_name}</p>` : ''}
              ${notification.action_url ? `<a href="${actionUrl}" class="button">Voir les détails</a>` : ''}
            </div>
            <div class="footer">
              <p>Vous recevez cet email car vous êtes membre de la session "${sessionName}" sur CarboScan.</p>
              <p>Pour modifier vos préférences de notification, connectez-vous à votre compte CarboScan.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Envoyer l'email
    const emailSent = await sendEmail({
      to: user_email,
      subject: `[CarboScan] ${notification.title}`,
      html: emailHtml,
    });

    if (emailSent) {
      // Marquer la notification comme envoyée
      await supabaseClient
        .from('collect_notifications')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', notification_id);

      return new Response(
        JSON.stringify({ success: true, message: 'Email sent successfully' }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});



