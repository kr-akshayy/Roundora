/**
 * Roundora — verify-razorpay-payment Edge Function
 *
 * Verifies a Razorpay payment's HMAC signature server-side.
 * On success, marks the booking as confirmed and payment as paid.
 * On failure, logs the attempt but takes no action.
 *
 * SECURITY: amount_paid is fetched from the DB (via the booking's mentor profile),
 * not from the client, to prevent tampering.
 *
 * Request body: {
 *   razorpay_order_id: string,
 *   razorpay_payment_id: string,
 *   razorpay_signature: string,
 *   booking_id: string,
 * }
 * Response: { success: true } | { error: string }
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';
import { encode } from 'https://deno.land/std@0.177.0/encoding/hex.ts';

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
    if (!RAZORPAY_KEY_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Razorpay is not configured.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = await req.json();

    // Verify HMAC-SHA256 signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const keyBytes = new TextEncoder().encode(RAZORPAY_KEY_SECRET);
    const msgBytes = new TextEncoder().encode(body);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
    const computedSig = new TextDecoder().decode(encode(new Uint8Array(signature)));

    if (computedSig !== razorpay_signature) {
      console.error(`Signature mismatch for booking ${booking_id}. Expected: ${computedSig}, Got: ${razorpay_signature}`);
      return new Response(
        JSON.stringify({ error: 'Payment verification failed: invalid signature.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Signature is valid — fetch authoritative amount from DB, then confirm the booking
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get the booking to find mentor and derive amount_paid
    const { data: bookingRow } = await supabase
      .from('bookings')
      .select('mentor_id')
      .eq('id', booking_id)
      .single();

    let amountPaid: number | null = null;
    if (bookingRow?.mentor_id) {
      const { data: mentorProfile } = await supabase
        .from('profiles')
        .select('price_per_session')
        .eq('id', bookingRow.mentor_id)
        .single();
      amountPaid = mentorProfile?.price_per_session ?? null;
    }

    const { error } = await supabase.from('bookings').update({
      status: 'confirmed',
      payment_status: 'paid',
      razorpay_payment_id,
      amount_paid: amountPaid,
    }).eq('id', booking_id).eq('razorpay_order_id', razorpay_order_id);

    if (error) {
      console.error('Supabase update error:', error);
      return new Response(
        JSON.stringify({ error: 'Payment verified but booking update failed. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
