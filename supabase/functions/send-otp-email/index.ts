// Supabase Edge Function: send-otp-email
// Yeh function:
// 1. User ka email leta hai
// 2. Supabase Admin se OTP token generate karta hai
// 3. Resend API se branded HTML email bhejta hai (same style as send-reset-email)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check karo ki user exist karta hai ya nahi
    const { data: userList, error: userListErr } = await supabaseAdmin.auth.admin.listUsers();
    if (userListErr) throw new Error(`User check error: ${userListErr.message}`);

    const userExists = userList.users.some(
      (u: { email?: string }) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    if (!userExists) {
      return new Response(
        JSON.stringify({ error: 'user_not_found', message: 'Yeh email registered nahi hai.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OTP generate karo via magiclink admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.trim(),
    });

    if (linkError) {
      console.error('OTP generation error:', linkError);
      throw new Error(`OTP generation error: ${linkError.message}`);
    }

    const otpToken = linkData?.properties?.email_otp;

    if (!otpToken) {
      throw new Error('Failed to generate OTP from Supabase Auth');
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const emailHtml = generateOtpEmailHtml(otpToken, email.trim());

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('FROM_EMAIL') ?? 'Roundora <noreply@roundora.in>',
        to: [email.trim()],
        subject: 'Your Roundora Login Code',
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
    const errorMsg = err instanceof Error ? err.message : 'Internal server error';
    console.error('Edge function error:', errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateOtpEmailHtml(otp: string, email: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Roundora Login Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f8;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#1a1a2e;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.3);">
          <tr>
            <td style="background:linear-gradient(135deg,#312e81 0%,#4f46e5 50%,#7c3aed 100%);padding:36px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:16px;padding:8px 18px;">
                    <span style="color:#fff;font-size:16px;font-weight:800;letter-spacing:0.5px;">Roundora</span>
                  </td>
                </tr>
              </table>
              <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px;">Your Login Code</h1>
              <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0;">Use this OTP to sign in to your Roundora account</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;background:#1a1a2e;">
              <p style="color:#94a3b8;font-size:15px;margin:0 0 24px;line-height:1.7;">
                Hey there! We received a sign-in request for <strong style="color:#c7d2fe;">${email}</strong>. Enter the code below to continue:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,rgba(79,70,229,0.2),rgba(124,58,237,0.2));border:1.5px solid rgba(99,102,241,0.5);border-radius:18px;padding:28px 20px;">
                    <p style="margin:0 0 10px 0;color:#8b8fa8;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Verification Code</p>
                    <p style="margin:0;color:#ffffff;font-size:36px;font-weight:900;letter-spacing:10px;font-family:'Courier New',monospace;line-height:1.2;">${otp}</p>
                    <p style="margin:12px 0 0 0;color:#6b7280;font-size:13px;">Expires in <strong style="color:#f59e0b;">10 minutes</strong></p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <p style="margin:0 0 12px 0;color:#6366f1;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">How to use</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:4px 0;color:#94a3b8;font-size:13px;"><span style="color:#4f46e5;font-weight:700;">1.</span>&nbsp;&nbsp;Go back to the Roundora login page</td></tr>
                      <tr><td style="padding:4px 0;color:#94a3b8;font-size:13px;"><span style="color:#4f46e5;font-weight:700;">2.</span>&nbsp;&nbsp;Enter the 6-digit code above in the OTP field</td></tr>
                      <tr><td style="padding:4px 0;color:#94a3b8;font-size:13px;"><span style="color:#4f46e5;font-weight:700;">3.</span>&nbsp;&nbsp;Click Verify &amp; Login to sign in</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:14px 18px;">
                    <p style="margin:0;color:#d97706;font-size:12px;line-height:1.6;">
                      Security tip: Never share this code with anyone. Roundora team will never ask for your OTP.
                      If you did not request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#13132a;border-top:1px solid rgba(255,255,255,0.07);padding:22px 40px;text-align:center;">
              <p style="color:#4b5563;font-size:12px;margin:0;line-height:1.6;">
                &copy; ${year} Roundora &middot; Ace Your Interviews<br/>
                <a href="https://roundora.in" style="color:#6366f1;text-decoration:none;">roundora.in</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
