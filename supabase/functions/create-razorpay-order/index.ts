/**
 * Roundora — create-razorpay-order Edge Function
 *
 * Creates a Razorpay order server-side and returns order_id + key_id.
 * The Razorpay secret key NEVER leaves this server.
 *
 * SECURITY: Amount is NOT accepted from the client. The server fetches
 * the authoritative price from the database (profiles.price_per_session)
 * to prevent client-side amount manipulation.
 *
 * Setup:
 *   supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx
 *   supabase secrets set RAZORPAY_KEY_SECRET=your_secret
 *
 * Request body: { booking_id: string, currency?: string }
 * Response: { order_id: string, key_id: string, amount: number, currency: string }
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Razorpay is not configured. Please contact support.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { booking_id, currency = 'INR' } = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'Missing booking_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch booking → slot → mentor profile to get authoritative price
    // Client CANNOT control the amount this way.
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, mentor_id, slot_id, status, payment_status')
      .eq('id', booking_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Guard: only allow order creation for pending/unpaid bookings
    if (booking.payment_status === 'paid') {
      return new Response(
        JSON.stringify({ error: 'This booking is already paid.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch mentor's price from their profile (authoritative source)
    const { data: mentorProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('price_per_session')
      .eq('id', booking.mentor_id)
      .single();

    if (profileErr || !mentorProfile || mentorProfile.price_per_session == null) {
      return new Response(
        JSON.stringify({ error: 'Interviewer pricing is not configured.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authorizedAmount = mentorProfile.price_per_session as number;

    // Create Razorpay order using the server-fetched amount
    const authHeader = `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`;
    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(authorizedAmount * 100), // Razorpay expects paise
        currency,
        receipt: booking_id,
      }),
    });

    const order = await razorpayRes.json();

    if (!razorpayRes.ok) {
      throw new Error(order.error?.description ?? 'Failed to create Razorpay order');
    }

    // Store order_id in booking record
    await supabase
      .from('bookings')
      .update({ razorpay_order_id: order.id, payment_status: 'pending' })
      .eq('id', booking_id);

    return new Response(
      JSON.stringify({
        order_id: order.id,
        key_id: RAZORPAY_KEY_ID,
        amount: order.amount,        // paise — use this to initialise Razorpay checkout
        amount_inr: authorizedAmount, // rupees — for display
        currency: order.currency,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
