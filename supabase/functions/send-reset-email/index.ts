// Supabase Edge Function: send-reset-email
// Yeh function:
// 1. User ka email leta hai
// 2. Supabase Admin se secure password reset link generate karta hai
// 3. Resend API se branded HTML email bhejta hai

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, redirectTo } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supabase Admin client (service_role key use karta hai)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Secure password reset link generate karo
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo ?? `${Deno.env.get('SITE_URL') ?? 'http://localhost:5173'}/reset-password`,
      },
    });

    if (linkError) {
      console.error('Link generation error:', linkError);
      // User ko zyada info mat do security ke liye
      return new Response(
        JSON.stringify({ success: true }), // Always return success to prevent email enumeration
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resetLink = linkData?.properties?.action_link;
    if (!resetLink) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resend API se email bhejo
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emailHtml = generateEmailHtml(resetLink);

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('FROM_EMAIL') ?? 'Roundora <onboarding@resend.dev>',
        to: [email],
        subject: '🔐 Reset Your Roundora Password',
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const resendError = await resendRes.text();
      console.error('Resend error:', resendError);
      throw new Error(`Resend API error: ${resendError}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Branded HTML email template
function generateEmailHtml(resetLink: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f8;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#312e81 0%,#4f46e5 50%,#7c3aed 100%);padding:36px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.15);border-radius:20px;padding:8px 18px;border:1px solid rgba(255,255,255,0.2);">
                <span style="color:#fff;font-size:18px;font-weight:800;letter-spacing:-0.5px;">🎯 Roundora</span>
              </div>
              <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:20px 0 8px;letter-spacing:-0.5px;">Reset Your Password</h1>
              <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;">We received a request to reset your password</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#374151;font-size:16px;margin:0 0 24px;line-height:1.6;">
                Hi there! 👋<br/><br/>
                Someone (hopefully you!) requested a password reset for your Roundora account. 
                Click the button below to set a new password.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetLink}" 
                   style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;border-radius:14px;font-size:16px;font-weight:700;letter-spacing:0.2px;box-shadow:0 4px 20px rgba(99,102,241,0.4);">
                  🔑 Reset My Password
                </a>
              </div>

              <!-- Fallback link -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:24px 0;">
                <p style="color:#64748b;font-size:12px;margin:0 0 8px;font-weight:600;">Button not working? Copy this link:</p>
                <p style="color:#4f46e5;font-size:11px;margin:0;word-break:break-all;">${resetLink}</p>
              </div>

              <!-- Warning -->
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin:16px 0;">
                <p style="color:#9a3412;font-size:13px;margin:0;line-height:1.5;">
                  ⚠️ <strong>This link expires in 1 hour.</strong> If you didn't request this, 
                  please ignore this email — your password won't change.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
                © ${new Date().getFullYear()} Roundora · Ace Your Interviews<br/>
                <a href="https://roundora.com" style="color:#6366f1;text-decoration:none;">roundora.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
