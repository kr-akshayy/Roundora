export type UserRole = 'student' | 'mentor';

export interface Profile {
  id: string;
  email?: string | null;
  full_name: string;
  role: UserRole;
  headline: string | null;
  bio: string | null;
  company: string | null;
  years_experience: number | null;
  price_per_session: number | null;
  avatar_url: string | null;
  expertise: string[] | null;
  linkedin_url?: string | null;
  is_verified?: boolean;
  is_admin?: boolean;
  is_suspended?: boolean;
  created_at: string;
}

export interface Slot {
  id: string;
  mentor_id: string;
  start_time: string;
  duration_minutes: number;
  topic: string | null;
  is_booked: boolean;
  created_at: string;
}

export interface RecurringSchedule {
  id: string;
  mentor_id: string;
  day_of_week: number; // 0=Sun, 1=Mon, ..., 6=Sat
  time_of_day: string; // 'HH:MM:SS'
  duration_minutes: number;
  topic: string | null;
  is_active: boolean;
  created_at: string;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'refunded'
  | 'no_show';

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded';

export interface Booking {
  id: string;
  student_id: string;
  mentor_id: string;
  slot_id: string;
  meeting_room: string;
  status: BookingStatus;
  payment_status?: PaymentStatus;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  amount_paid?: number | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  // joined fields (populated client-side)
  mentor?: Profile;
  student?: Profile;
  slot?: Slot;
}

export interface Review {
  id: string;
  booking_id: string;
  student_id: string;
  mentor_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  student?: Profile;
}

export type Recommendation = 'strong_hire' | 'consider' | 'no_hire';

export interface InterviewScorecard {
  id: string;
  booking_id: string;
  interviewer_id: string;
  candidate_id: string;
  // Dimension scores (0–10)
  technical_score: number | null;
  dsa_score: number | null;
  problem_solving_score: number | null;
  communication_score: number | null;
  confidence_score: number | null;
  code_quality_score: number | null;
  overall_score: number | null;
  // Qualitative
  strengths: string[];
  improvements: string[];
  questions_asked: string[];
  recommended_topics: string[];
  notes: string | null;
  recommendation: Recommendation | null;
  created_at: string;
  // joined
  interviewer?: Profile;
  candidate?: Profile;
  booking?: Booking;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface InterviewerApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  linkedin_url: string | null;
  company: string;
  designation: string;
  years_experience: number;
  skills: string[];
  resume_url: string | null;
  introduction: string;
  interviewing_experience: string;
  status: ApplicationStatus;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  // joined
  applicant?: Profile;
}

export type CallStatus =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'declined'
  | 'missed'
  | 'ended'
  | 'busy'
  | 'error';

export interface CallSession {
  id: string;
  booking_id: string;
  student_id: string;
  interviewer_id: string;
  caller_id: string;
  status: 'ringing' | 'accepted' | 'declined' | 'missed' | 'ended' | 'busy';
  started_at?: string | null;
  accepted_at?: string | null;
  ended_at?: string | null;
  created_at: string;
}

export interface CallInvitationData {
  sessionId: string;
  bookingId: string;
  callerId: string;
  callerName: string;
  callerRole: 'student' | 'mentor';
  callerAvatar?: string | null;
  recipientId: string;
  recipientName: string;
  topic?: string | null;
  meetingRoom: string;
  scheduledTime?: string | null;
}

