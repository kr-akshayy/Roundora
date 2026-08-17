// Printable & Downloadable Official Interview Scorecard PDF generator

import type { InterviewScorecard } from '../types';

export function generateScorecardPrintableWindow(data: {
  studentName: string;
  mentorName: string;
  mentorCompany?: string | null;
  rating: number; // overall score (0-10)
  comment?: string | null;
  topic?: string | null;
  dateStr: string;
  bookingId: string;
  scorecard?: InterviewScorecard | null;
}) {
  const printWindow = window.open('', '_blank', 'width=900,height=1200');
  if (!printWindow) return;

  const sc = data.scorecard;
  const overall = sc?.overall_score ?? data.rating;

  const scoreColor = (s: number) =>
    s >= 8 ? '#059669' : s >= 6 ? '#4f46e5' : s >= 4 ? '#d97706' : '#e11d48';

  const scoreBg = (s: number) =>
    s >= 8 ? '#d1fae5' : s >= 6 ? '#e0e7ff' : s >= 4 ? '#fef3c7' : '#ffe4e6';

  const dimRows = sc ? [
    { label: 'Technical Knowledge', score: sc.technical_score },
    { label: 'DSA & Coding', score: sc.dsa_score },
    { label: 'Problem Solving', score: sc.problem_solving_score },
    { label: 'Communication', score: sc.communication_score },
    { label: 'Confidence', score: sc.confidence_score },
    { label: 'Code Quality', score: sc.code_quality_score },
  ].filter(r => r.score !== null) : [];

  const recMap: Record<string, string> = {
    strong_hire: '✅ Strong Hire — Ready for the role',
    consider: '🔄 Consider — Some areas to strengthen',
    no_hire: '❌ No Hire — Needs more preparation',
  };

  const scoreBarHtml = (score: number | null) => {
    if (score === null) return '';
    const pct = ((score ?? 0) / 10) * 100;
    return `<div style="height:8px;background:#f1f5f9;border-radius:8px;overflow:hidden;margin-top:4px;">
      <div style="height:100%;width:${pct}%;background:${scoreColor(score)};border-radius:8px;"></div>
    </div>`;
  };

  const tagListHtml = (tags: string[] | null | undefined, color = '#4f46e5', bg = '#e0e7ff') =>
    tags && tags.length > 0
      ? tags.map(t => `<span style="display:inline-block;padding:3px 10px;border-radius:20px;background:${bg};color:${color};font-size:12px;font-weight:600;margin:2px;border:1px solid ${color}33;">${t}</span>`).join('')
      : '<span style="color:#94a3b8;font-size:13px;">—</span>';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Roundora Interview Scorecard — ${data.studentName}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 32px;
      font-size: 14px;
      line-height: 1.5;
    }
    .container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 24px; border: 1px solid #e2e8f0; box-shadow: 0 8px 32px rgba(0,0,0,0.06); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e1b4b, #4338ca); color: #fff; padding: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header-left .logo { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 8px; }
    .header-left .badge { display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .header-right .big-score { font-size: 56px; font-weight: 900; line-height: 1; }
    .header-right .score-label { font-size: 12px; opacity: 0.6; margin-top: 4px; }
    .body { padding: 28px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; }
    .info-label { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
    .info-val { font-size: 15px; font-weight: 700; color: #0f172a; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 13px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #f1f5f9; }
    .dim-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .dim-label { font-size: 13px; color: #475569; width: 180px; flex-shrink: 0; }
    .dim-bar-wrap { flex: 1; }
    .dim-score { font-size: 14px; font-weight: 800; width: 42px; text-align: right; }
    .rec-badge { display: inline-block; padding: 8px 20px; border-radius: 14px; font-size: 14px; font-weight: 800; margin-top: 8px; }
    .feedback-section { background: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px 20px; border-radius: 0 14px 14px 0; margin-bottom: 16px; }
    .list-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #475569; }
    .dot { flex-shrink: 0; margin-top: 5px; width: 6px; height: 6px; border-radius: 50%; }
    .footer { text-align: center; padding: 20px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
    .btn-print { background: #4f46e5; color: #fff; border: none; padding: 12px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; margin: 16px auto; display: block; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="logo">Roundora</div>
        <div class="badge">Official Interview Scorecard</div>
      </div>
      <div class="header-right" style="text-align:right;">
        <div class="big-score">${overall.toFixed(1)}</div>
        <div class="score-label">Overall Score /10</div>
        ${sc?.recommendation ? `<div style="margin-top:8px;background:rgba(255,255,255,0.15);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">${recMap[sc.recommendation] ?? ''}</div>` : ''}
      </div>
    </div>

    <div class="body">
      <!-- Session Info -->
      <div class="grid-2">
        <div class="info-box">
          <div class="info-label">Candidate</div>
          <div class="info-val">${data.studentName}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Interviewer</div>
          <div class="info-val">${data.mentorName}${data.mentorCompany ? ` <span style="font-weight:400;font-size:12px;color:#64748b;">(${data.mentorCompany})</span>` : ''}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Interview Type</div>
          <div class="info-val">${data.topic || '1-on-1 Mock Interview'}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Session Date</div>
          <div class="info-val">${data.dateStr}</div>
        </div>
      </div>

      ${dimRows.length > 0 ? `
      <!-- Dimension Scores -->
      <div class="section">
        <div class="section-title">Performance Breakdown</div>
        ${dimRows.map(r => `
          <div class="dim-row">
            <div class="dim-label">${r.label}</div>
            <div class="dim-bar-wrap">
              ${scoreBarHtml(r.score)}
            </div>
            <div class="dim-score" style="color:${scoreColor(r.score ?? 0)};background:${scoreBg(r.score ?? 0)};padding:2px 8px;border-radius:8px;">${(r.score ?? 0).toFixed(1)}</div>
          </div>
        `).join('')}
      </div>` : ''}

      ${sc?.strengths && sc.strengths.length > 0 ? `
      <!-- Strengths -->
      <div class="section">
        <div class="section-title">✅ Strengths</div>
        ${sc.strengths.map(s => `<div class="list-item"><div class="dot" style="background:#059669;"></div><span>${s}</span></div>`).join('')}
      </div>` : ''}

      ${sc?.improvements && sc.improvements.length > 0 ? `
      <!-- Areas to Improve -->
      <div class="section">
        <div class="section-title">⚠️ Areas to Improve</div>
        ${sc.improvements.map(s => `<div class="list-item"><div class="dot" style="background:#d97706;"></div><span>${s}</span></div>`).join('')}
      </div>` : ''}

      ${sc?.questions_asked && sc.questions_asked.length > 0 ? `
      <!-- Questions Asked -->
      <div class="section">
        <div class="section-title">📝 Questions Asked</div>
        <div>${tagListHtml(sc.questions_asked, '#334155', '#f1f5f9')}</div>
      </div>` : ''}

      ${sc?.recommended_topics && sc.recommended_topics.length > 0 ? `
      <!-- Recommended Topics -->
      <div class="section">
        <div class="section-title">📚 Recommended Topics to Study</div>
        <div>${tagListHtml(sc.recommended_topics, '#4f46e5', '#e0e7ff')}</div>
      </div>` : ''}

      ${(sc?.notes || data.comment) ? `
      <!-- Interviewer Notes -->
      <div class="section">
        <div class="section-title">💬 Interviewer Notes</div>
        <div class="feedback-section">
          ${(sc?.notes || data.comment || '').replace(/\n/g, '<br/>')}
        </div>
      </div>` : ''}

      <!-- Print Button -->
      <div class="no-print" style="text-align:center;margin-top:24px;">
        <button onclick="window.print()" class="btn-print">🖨️ Print / Download PDF</button>
      </div>
    </div>

    <div class="footer">
      Generated by Roundora Mock Interview Platform &middot; Session ID: ${data.bookingId}<br/>
      https://www.roundora.in
    </div>
  </div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
