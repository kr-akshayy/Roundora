// Supabase Edge Function: send-support-ticket
// This function:
// 1. Accepts support ticket payloads (senderEmail, senderName, issueType, subject, message, bookingId)
// 2. Emails the admin directly at vilenisop7@gmail.com via Resend API
// 3. Sends an automated confirmation receipt to the user

const ADMIN_EMAIL = 'vilenisop7@gmail.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { senderEmail, senderName, issueType, subject, message, bookingId, participantName } = await req.json();

    if (!senderEmail || !message) {
      return new Response(
        JSON.stringify({ error: 'senderEmail and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'Roundora Support <noreply@roundora.in>';

    // 1. Email to Admin (vilenisop7@gmail.com)
    const adminHtml = generateAdminTicketEmailHtml({
      senderEmail,
      senderName: senderName || 'User',
      issueType: issueType || 'general',
      subject: subject || 'Support Request',
      message,
      bookingId,
      participantName,
    });

    const adminEmailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [ADMIN_EMAIL],
        reply_to: senderEmail.trim(),
        subject: `🚨 [ROUNDORA SUPPORT] ${(issueType || 'TICKET').toUpperCase()}: ${subject || 'New Support Message'}`,
        html: adminHtml,
      }),
    });

    if (!adminEmailRes.ok) {
      const errText = await adminEmailRes.text();
      console.error('Failed to send admin ticket email:', errText);
    }

    // 2. Confirmation email to User
    const userReceiptHtml = generateUserReceiptEmailHtml({
      senderName: senderName || 'User',
      issueType: issueType || 'general',
      subject: subject || 'Support Request',
    });

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [senderEmail.trim()],
        subject: `✅ Ticket Received - Roundora Support`,
        html: userReceiptHtml,
      }),
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error';
    console.error('Support ticket error:', errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateAdminTicketEmailHtml(data: {
  senderEmail: string;
  senderName: string;
  issueType: string;
  subject: string;
  message: string;
  bookingId?: string;
  participantName?: string;
}): string {
  const isUrgent = data.issueType === 'misbehaviour';
  const headerBg = isUrgent ? 'linear-gradient(135deg,#991b1b,#dc2626)' : 'linear-gradient(135deg,#1e1b4b,#4338ca)';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>New Support Ticket</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f8;font-family:'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:580px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:${headerBg};padding:30px;text-align:center;color:#ffffff;">
              <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;">
                ${isUrgent ? '🚨 URGENT MISBEHAVIOUR REPORT' : '📩 NEW SUPPORT TICKET'}
              </h1>
              <p style="margin:0;font-size:13px;opacity:0.85;">Roundora Support System Alert</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;background:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 6px;color:#64748b;font-size:12px;"><strong>From:</strong> ${data.senderName} (&lt;${data.senderEmail}&gt;)</p>
                    <p style="margin:0 0 6px;color:#64748b;font-size:12px;"><strong>Issue Category:</strong> <span style="color:#2563eb;font-weight:700;text-transform:uppercase;">${data.issueType}</span></p>
                    <p style="margin:0 0 6px;color:#64748b;font-size:12px;"><strong>Subject:</strong> ${data.subject}</p>
                    ${data.bookingId ? `<p style="margin:0 0 6px;color:#64748b;font-size:12px;"><strong>Booking / Session ID:</strong> ${data.bookingId}</p>` : ''}
                    ${data.participantName ? `<p style="margin:0;color:#64748b;font-size:12px;"><strong>Participant Involved:</strong> ${data.participantName}</p>` : ''}
                  </td>
                </tr>
              </table>

              <div style="background:#fff;border-left:4px solid #4f46e5;padding:16px;margin-bottom:24px;border-radius:0 10px 10px 0;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
                <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;">Message Body</p>
                <p style="margin:0;color:#0f172a;font-size:14px;line-height:1.6;white-space:pre-wrap;">${data.message}</p>
              </div>

              <div style="text-align:center;">
                <a href="mailto:${data.senderEmail}?subject=Re:%20${encodeURIComponent(data.subject)}"
                   style="display:inline-block;padding:12px 28px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">
                  Reply to ${data.senderName} (&lt;${data.senderEmail}&gt;)
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 30px;text-align:center;color:#94a3b8;font-size:12px;">
              Sent automatically by Roundora Support Ticket Engine
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateUserReceiptEmailHtml(data: { senderName: string; issueType: string; subject: string }): string {
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.roundora.in';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Ticket Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f8;font-family:'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:540px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#312e81,#4f46e5);padding:30px;text-align:center;color:#ffffff;">
              <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;">✅ Support Ticket Received</h1>
              <p style="margin:0;font-size:13px;opacity:0.85;">Roundora Support Team</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;background:#ffffff;">
              <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.6;">
                Hi <strong>${data.senderName}</strong>,<br/><br/>
                We have received your support request regarding <strong>"${data.subject}"</strong>. Our support & safety team is reviewing your message and will get back to you shortly.
              </p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:20px 0;">
                <p style="margin:0;color:#166534;font-size:13px;line-height:1.5;">
                  📞 Urgent queries? You can also reach our team on Call / WhatsApp at <strong>+91 7488455190</strong>.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 30px;text-align:center;color:#94a3b8;font-size:12px;">
              © ${new Date().getFullYear()} Roundora · <a href="${siteUrl}" style="color:#6366f1;text-decoration:none;">${siteUrl.replace('https://', '')}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
