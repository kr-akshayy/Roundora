// Printable & Downloadable Official Interview Scorecard PDF generator

export function generateScorecardPrintableWindow(data: {
  studentName: string;
  mentorName: string;
  mentorCompany?: string | null;
  rating: number;
  comment?: string | null;
  topic?: string | null;
  dateStr: string;
  bookingId: string;
}) {
  const printWindow = window.open('', '_blank', 'width=850,height=1100');
  if (!printWindow) return;

  const scoreMap: Record<number, string> = {
    1: 'Needs Improvement (1/5)',
    2: 'Fair Performance (2/5)',
    3: 'Good Performance (3/5)',
    4: 'Strong Performance (4/5)',
    5: 'Exceptional Top 1% (5/5)',
  };

  const starsHtml = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Roundora Official Interview Scorecard - ${data.studentName}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 30px;
      background: #f8fafc;
      color: #0f172a;
    }
    .container {
      max-width: 780px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      padding: 40px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #4f46e5;
      letter-spacing: -0.5px;
    }
    .badge {
      background: #e0e7ff;
      color: #3730a3;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 20px;
      text-transform: uppercase;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .info-box {
      background: #f1f5f9;
      padding: 16px;
      border-radius: 16px;
    }
    .label {
      font-size: 11px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .val {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .score-card {
      background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%);
      color: #ffffff;
      padding: 24px;
      border-radius: 20px;
      text-align: center;
      margin-bottom: 28px;
    }
    .stars {
      font-size: 32px;
      color: #fbbf24;
      margin: 8px 0;
    }
    .feedback-box {
      background: #f8fafc;
      border-left: 4px solid #4f46e5;
      padding: 20px;
      border-radius: 0 16px 16px 0;
      margin-bottom: 28px;
      font-size: 14px;
      line-height: 1.7;
    }
    .btn-print {
      background: #4f46e5;
      color: #fff;
      border: none;
      padding: 12px 28px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 30px;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Roundora</div>
      <div class="badge">Official Performance Scorecard</div>
    </div>

    <div class="score-card">
      <div style="font-size: 12px; opacity: 0.85; text-transform: uppercase; font-weight: 700;">Overall Session Rating</div>
      <div class="stars">${starsHtml}</div>
      <div style="font-size: 18px; font-weight: 800;">${scoreMap[data.rating] || 'Evaluated'}</div>
    </div>

    <div class="grid">
      <div class="info-box">
        <div class="label">Candidate Student</div>
        <div class="val">${data.studentName}</div>
      </div>
      <div class="info-box">
        <div class="label">Interviewer / Mentor</div>
        <div class="val">${data.mentorName} ${data.mentorCompany ? `(${data.mentorCompany})` : ''}</div>
      </div>
      <div class="info-box">
        <div class="label">Round Topic</div>
        <div class="val">${data.topic || '1-on-1 Mock Interview'}</div>
      </div>
      <div class="info-box">
        <div class="label">Session Date</div>
        <div class="val">${data.dateStr}</div>
      </div>
    </div>

    <div class="label" style="margin-bottom: 8px;">Detailed Mentor Feedback & Assessment</div>
    <div class="feedback-box">
      ${data.comment ? data.comment.replace(/\n/g, '<br/>') : 'No detailed written comments added.'}
    </div>

    <div style="text-align: center;" class="no-print">
      <button onclick="window.print()" class="btn-print">🖨️ Print / Download PDF Scorecard</button>
    </div>

    <div class="footer">
      Generated automatically by Roundora Mock Interview Platform · Session ID: ${data.bookingId}<br/>
      https://www.roundora.in
    </div>
  </div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
