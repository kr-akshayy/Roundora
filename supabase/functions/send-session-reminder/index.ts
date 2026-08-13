// Supabase Edge Function: send-session-reminder
// This function runs as a scheduled cron job (every 5 minutes).
// It checks for bookings starting in ~30 minutes and sends:
// 1. An email reminder to both the student and mentor
// 2. Each email contains a "Join via WhatsApp" link to alert them on their phone

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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
    const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.roundora.in';
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Roundora <noreply@roundora.in>';
    const TEAM_WHATSAPP = '917488455190';

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find bookings starting in 25-35 minutes (5 min window so no duplicate sends)
    const now = new Date();
    const windowStart = new Date(now.getTime() + 25 * 60 * 1000); // 25 min from now
    const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);   // 35 min from now

    const { data: upcomingBookings, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        meeting_room,
        status,
        reminder_sent,
        student:student_id(id, full_name, email),
        mentor:mentor_id(id, full_name, email),
        slot:slot_id(start_time, duration_minutes, topic)
      `)
      .eq('status', 'confirmed')
      .eq('reminder_sent', false)
      .gte('slot.start_time', windowStart.toISOString())
      .lte('slot.start_time', windowEnd.toISOString());

    if (fetchError) {
      console.error('Error fetching bookings:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bookings = (upcomingBookings ?? []) as any[];
    console.log(`Found ${bookings.length} upcoming sessions to remind.`);

    const results = [];

    for (const booking of bookings) {
      const slot = booking.slot;
      const student = booking.student;
      const mentor = booking.mentor;

      if (!slot || !student || !mentor) continue;

      const sessionTime = new Date(slot.start_time).toLocaleString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const roomUrl = `${SITE_URL}/room/${booking.id}`;
      const topic = slot.topic ?? '1-on-1 Interview';

      // WhatsApp reminder link (pre-filled message)
      const waStudentMsg = encodeURIComponent(
        `📅 Reminder: Your Roundora interview session with ${mentor.full_name} starts in 30 minutes! Join here: ${roomUrl}`
      );
      const waMentorMsg = encodeURIComponent(
        `📅 Reminder: Your Roundora session with student ${student.full_name} starts in 30 minutes! Join here: ${roomUrl}`
      );

      // Send reminder to student
      if (student.email) {
        const studentHtml = generateReminderHtml({
          recipientName: student.full_name,
          recipientRole: 'student',
          otherPersonName: mentor.full_name,
          otherPersonRole: 'Interviewer',
          sessionTime,
          topic,
          roomUrl,
          waLink: `https://wa.me/${TEAM_WHATSAPP}?text=${waStudentMsg}`,
          siteUrl: SITE_URL,
        });

        await sendEmail(RESEND_API_KEY, FROM_EMAIL, student.email, studentHtml);
      }

      // Send reminder to mentor
      if (mentor.email) {
        const mentorHtml = generateReminderHtml({
          recipientName: mentor.full_name,
          recipientRole: 'mentor',
          otherPersonName: student.full_name,
          otherPersonRole: 'Student',
          sessionTime,
          topic,
          roomUrl,
          waLink: `https://wa.me/${TEAM_WHATSAPP}?text=${waMentorMsg}`,
          siteUrl: SITE_URL,
        });

        await sendEmail(RESEND_API_KEY, FROM_EMAIL, mentor.email, mentorHtml);
      }

      // Mark reminder as sent
      await supabase
        .from('bookings')
        .update({ reminder_sent: true })
        .eq('id', booking.id);

      results.push({ bookingId: booking.id, status: 'reminder_sent' });
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error';
    console.error('Session reminder error:', errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendEmail(apiKey: string, from: string, to: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to.trim()],
      subject: '⏰ Your Roundora Session Starts in 30 Minutes!',
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to send reminder email to ${to}:`, err);
  }
}

function generateReminderHtml(data: {
  recipientName: string;
  recipientRole: string;
  otherPersonName: string;
  otherPersonRole: string;
  sessionTime: string;
  topic: string;
  roomUrl: string;
  waLink: string;
  siteUrl: string;
}): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Session Reminder - Roundora</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4ff;font-family:'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e1b4b 0%,#4f46e5 60%,#7c3aed 100%);padding:36px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:16px;padding:6px 16px;">
                    <span style="color:#fff;font-size:14px;font-weight:800;letter-spacing:0.5px;">Roundora</span>
                  </td>
                </tr>
              </table>
              <div style="font-size:48px;margin-bottom:8px;">⏰</div>
              <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px;">Session Starts in 30 Minutes!</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">Get ready for your upcoming mock interview session</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;background:#ffffff;">
              <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.7;">
                Hi <strong>${data.recipientName}</strong>,<br/><br/>
                This is a reminder that your 1-on-1 session with <strong>${data.otherPersonName}</strong> (${data.otherPersonRole}) is starting in <strong>30 minutes</strong>. Please make sure you are ready!
              </p>

              <!-- Session Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 12px;color:#6366f1;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">Session Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:5px 0;color:#64748b;font-size:13px;width:110px;">${data.otherPersonRole}:</td>
                        <td style="padding:5px 0;color:#0f172a;font-size:13px;font-weight:700;">${data.otherPersonName}</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;color:#64748b;font-size:13px;">Scheduled At:</td>
                        <td style="padding:5px 0;color:#0f172a;font-size:13px;font-weight:700;">${data.sessionTime}</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;color:#64748b;font-size:13px;">Topic:</td>
                        <td style="padding:5px 0;color:#0f172a;font-size:13px;font-weight:700;">${data.topic}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary Join Button -->
              <div style="text-align:center;margin-bottom:16px;">
                <a href="${data.roomUrl}"
                   style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;border-radius:14px;font-size:16px;font-weight:800;letter-spacing:0.2px;box-shadow:0 4px 20px rgba(99,102,241,0.4);">
                  🎥 Join Session Now →
                </a>
              </div>

              <!-- WhatsApp Reminder Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${data.waLink}"
                   style="display:inline-block;padding:12px 32px;background:#25d366;color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:700;box-shadow:0 3px 12px rgba(37,211,102,0.35);">
                  💬 Get WhatsApp Reminder on Phone
                </a>
              </div>

              <!-- Tips Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 8px;color:#166534;font-size:13px;font-weight:700;">✅ Quick Checklist Before Your Session</p>
                    <ul style="margin:0;padding-left:18px;color:#15803d;font-size:12px;line-height:1.8;">
                      <li>Check your camera and microphone are working</li>
                      <li>Join from a quiet, well-lit location</li>
                      <li>Have a stable internet connection</li>
                      <li>Keep your resume / notes ready if needed</li>
                    </ul>
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
                <a href="${data.siteUrl}" style="color:#6366f1;text-decoration:none;">${data.siteUrl.replace('https://', '')}</a>
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
