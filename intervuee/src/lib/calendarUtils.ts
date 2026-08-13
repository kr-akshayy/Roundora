// Utility functions to generate Google Calendar links and .ics files for bookings

export function getGoogleCalendarUrl(data: {
  title: string;
  description: string;
  location: string;
  startTimeIso: string;
  durationMinutes?: number;
}): string {
  const startDate = new Date(data.startTimeIso);
  const duration = data.durationMinutes ?? 45;
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

  const formatIsoForGCal = (date: Date) =>
    date.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const datesParam = `${formatIsoForGCal(startDate)}/${formatIsoForGCal(endDate)}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: data.title,
    details: data.description,
    location: data.location,
    dates: datesParam,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcsFile(data: {
  title: string;
  description: string;
  location: string;
  startTimeIso: string;
  durationMinutes?: number;
  filename?: string;
}) {
  const startDate = new Date(data.startTimeIso);
  const duration = data.durationMinutes ?? 45;
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

  const formatIcsDate = (date: Date) =>
    date.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Roundora//1-on-1 Mock Interviews//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:roundora-${Date.now()}@roundora.in`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${data.title}`,
    `DESCRIPTION:${data.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${data.location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = data.filename || `roundora-session-${Date.now()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
