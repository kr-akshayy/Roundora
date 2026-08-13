// Supabase Edge Function: send-cancellation-email
// This function:
// 1. Accepts cancellation payload (studentEmail, studentName, mentorName, sessionTime, topic)
// 2. Sends a branded HTML cancellation notification to the student via Resend API

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
    const { studentEmail, studentName, mentorName, sessionTime, topic, cancelledBy } = await req.json();

    if (!studentEmail) {
      return new Response(
        JSON.stringify({ error: 'studentEmail is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emailHtml = generateCancellationEmailHtml({
      studentName: studentName || 'Student',
      mentorName: mentorName || 'Interviewer',
      sessionTime: sessionTime || 'Upcoming Session',
      topic: topic || '1-on-1 Interview',
      cancelledBy: cancelledBy || 'mentor',
    });

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('FROM_EMAIL') ?? 'Roundora <noreply@roundora.in>',
        to: [studentEmail.trim()],
        subject: `⚠️ Session Cancelled - Roundora`,
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
    console.error('Cancellation email error:', errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateCancellationEmailHtml(data: {
  studentName: string;
  mentorName: string;
  sessionTime: string;
  topic: string;
  cancelledBy: string;
}): string {
  const year = new Date().getFullYear();
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.roundora.in';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Session Cancelled - Roundora</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f8;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#991b1b 0%,#dc2626 50%,#b91c1c 100%);padding:36px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:16px;padding:6px 16px;">
                    <span style="color:#fff;font-size:14px;font-weight:800;letter-spacing:0.5px;">Roundora</span>
                  </td>
                </tr>
              </table>
              <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 6px;letter-spacing:-0.5px;">⚠️ Session Cancelled</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">Your upcoming mock interview session has been cancelled</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;background:#ffffff;">
              <p style="color:#374151;font-size:15px;margin:0 0 20px;line-height:1.6;">
                Hi <strong>${data.studentName}</strong>,<br/><br/>
                We regret to inform you that your upcoming 1-on-1 session with <strong>${data.mentorName}</strong> has been cancelled by the mentor.
              </p>

              <!-- Session Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 10px 0;color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Cancelled Session Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-size:13px;width:100px;">Interviewer:</td>
                        <td style="padding:4px 0;color:#0f172a;font-size:13px;font-weight:700;">${data.mentorName}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-size:13px;">Date & Time:</td>
                        <td style="padding:4px 0;color:#0f172a;font-size:13px;font-weight:700;">${data.sessionTime}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-size:13px;">Topic:</td>
                        <td style="padding:4px 0;color:#0f172a;font-size:13px;font-weight:700;">${data.topic}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Call out -->
              <p style="color:#475569;font-size:14px;margin:0 0 24px;line-height:1.6;">
                Don't worry! You can easily explore other available expert mentors and book a new session at your preferred time.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${siteUrl}/mentors"
                   style="display:inline-block;padding:15px 36px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:0.2px;box-shadow:0 4px 16px rgba(99,102,241,0.35);">
                  🔍 Browse Available Mentors →
                </a>
              </div>

              <!-- Support Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <p style="margin:0 0 6px 0;color:#1e40af;font-size:13px;font-weight:700;">Need Support or Have Questions?</p>
                    <p style="margin:0 0 10px 0;color:#1d4ed8;font-size:12px;line-height:1.5;">
                      Our team is here to help you reschedule or resolve any issues.
                    </p>
                    <p style="margin:0;color:#1e3a8a;font-size:13px;font-weight:700;">
                      📞 Call / WhatsApp: <a href="https://wa.me/917488455190" style="color:#2563eb;text-decoration:underline;">+91 7488455190</a><br/>
                      📧 Email: <a href="mailto:support@roundora.in" style="color:#2563eb;text-decoration:underline;">support@roundora.in</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
                © ${year} Roundora · Ace Your Interviews<br/>
                <a href="${siteUrl}" style="color:#6366f1;text-decoration:none;">${siteUrl.replace('https://', '')}</a>
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
