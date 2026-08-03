export type UserRole = 'student' | 'mentor';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  headline: string | null;
  bio: string | null;
  company: string | null;
  years_experience: number | null;
  price_per_session: number | null;
  avatar_url: string | null;
  expertise: string[] | null;
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

export type BookingStatus = 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  student_id: string;
  mentor_id: string;
  slot_id: string;
  meeting_room: string;
  status: BookingStatus;
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
