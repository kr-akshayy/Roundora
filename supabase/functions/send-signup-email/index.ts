// Supabase Edge Function: send-signup-email
// Flow:
// 1. Email + password + fullName + role leta hai
// 2. Supabase Admin se user create karta hai (no default email)
// 3. Signup OTP generate karta hai
// 4. Resend se branded welcome email bhejta hai

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
    const { email, password, fullName, role } = await req.json();

    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: 'email, password, and fullName are required' }),
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

    // Generate signup link and create user in one atomic step via Supabase Admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email.trim(),
      password: password,
      options: {
        data: { full_name: fullName, role: role || 'student' },
      },
    });

    if (linkError) {
      const msg = linkError.message.toLowerCase();
      if (
        msg.includes('already') ||
        msg.includes('exists') ||
        msg.includes('registered') ||
        msg.includes('duplicate')
      ) {
        return new Response(
          JSON.stringify({ error: 'already_registered', message: 'This email is already registered. Please log in instead.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('Signup link generation error:', linkError);
      throw new Error(`Signup error: ${linkError.message}`);
    }

    const newUser = linkData?.user;
    const otpToken = linkData?.properties?.email_otp;

    if (!otpToken) {
      throw new Error('Failed to generate OTP code from Supabase Auth');
    }

    // Profile create/upsert
    if (newUser?.id) {
      await supabaseAdmin.from('profiles').upsert({
        id: newUser.id,
        full_name: fullName,
        role: role || 'student',
      });
    }

    // Resend se branded welcome email bhejo
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const ismentor = (role || 'student') === 'mentor';
    const emailHtml = generateWelcomeEmailHtml(otpToken, email.trim(), fullName, ismentor);

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('FROM_EMAIL') ?? 'Roundora <noreply@roundora.in>',
        to: [email.trim()],
        subject: 'Welcome to Roundora! Verify your email',
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

function generateWelcomeEmailHtml(otp: string, email: string, fullName: string, isMentor: boolean): string {
  const year = new Date().getFullYear();
  const roleColor = isMentor ? '#059669' : '#4f46e5';
  const roleName = isMentor ? 'Mentor' : 'Student';
  const roleEmoji = isMentor ? '💼' : '🎓';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Roundora!</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f8;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#1a1a2e;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.3);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#312e81 0%,#4f46e5 50%,#7c3aed 100%);padding:36px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:16px;padding:8px 18px;">
                    <span style="color:#fff;font-size:16px;font-weight:800;letter-spacing:0.5px;">Roundora</span>
                  </td>
                </tr>
              </table>
              <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px;">Welcome, ${fullName}! ${roleEmoji}</h1>
              <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0;">You signed up as a <strong style="color:#c7d2fe;">${roleName}</strong>. Verify your email to get started.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;background:#1a1a2e;">
              <p style="color:#94a3b8;font-size:15px;margin:0 0 24px;line-height:1.7;">
                Hey ${fullName}! 👋 Enter the verification code below to confirm your email and activate your Roundora account.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,rgba(79,70,229,0.2),rgba(124,58,237,0.2));border:1.5px solid rgba(99,102,241,0.5);border-radius:18px;padding:28px 20px;">
                    <p style="margin:0 0 10px 0;color:#8b8fa8;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Verification Code</p>
                    <p style="margin:0;color:#ffffff;font-size:40px;font-weight:900;letter-spacing:10px;font-family:'Courier New',monospace;line-height:1.2;">${otp}</p>
                    <p style="margin:12px 0 0 0;color:#6b7280;font-size:13px;">Expires in <strong style="color:#f59e0b;">10 minutes</strong></p>
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <p style="margin:0 0 12px 0;color:#6366f1;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">How to verify</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:4px 0;color:#94a3b8;font-size:13px;"><span style="color:#4f46e5;font-weight:700;">1.</span>&nbsp;&nbsp;Go back to the Roundora signup page</td></tr>
                      <tr><td style="padding:4px 0;color:#94a3b8;font-size:13px;"><span style="color:#4f46e5;font-weight:700;">2.</span>&nbsp;&nbsp;Enter the code above in the verification field</td></tr>
                      <tr><td style="padding:4px 0;color:#94a3b8;font-size:13px;"><span style="color:#4f46e5;font-weight:700;">3.</span>&nbsp;&nbsp;Your account will be activated instantly</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Security -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:14px 18px;">
                    <p style="margin:0;color:#d97706;font-size:12px;line-height:1.6;">
                      If you didn't create a Roundora account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
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
