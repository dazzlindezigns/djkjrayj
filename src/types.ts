export type BookingStatus =
  | 'inquiry_sent'
  | 'inquiry_submitted'
  | 'confirmed'
  | 'agreement_sent'
  | 'signed'
  | 'deposit_paid'
  | 'completed'
  | 'cancelled';

export interface Client {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface Booking {
  id: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  status: BookingStatus;
  event_date?: string;
  event_type?: string;
  venue?: string;
  guest_count?: number;
  start_time?: string;
  hours?: number;
  total_price?: number;
  deposit_amount?: number;
  package_name?: string;
  signed_at?: string;
  client_signature?: string;
  contract_pdf_path?: string;
  internal_notes?: string;
  discount_amount_off?: number;
  inquiry_token: string;
  // joined
  clients?: Client;
}

export interface EmailLog {
  id: string;
  created_at: string;
  booking_id: string;
  type: string;
  to_email: string;
  resend_id?: string;
  status: string;
}

export interface Survey {
  id: string;
  created_at: string;
  booking_id: string;
  app_rating?: number;
  app_comments?: string;
  dj_rating?: number;
  dj_comments?: string;
}
