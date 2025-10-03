import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.190.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    const body = await req.text();
    
    // Verify webhook signature
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return new Response('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(body);
    console.log('Webhook event:', payload.event);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const event = payload.event;
    const subscriptionData = payload.payload.subscription.entity;

    switch (event) {
      case 'subscription.activated': {
        console.log('Subscription activated:', subscriptionData.id);
        
        const { error } = await supabaseClient
          .from('subscriptions')
          .update({
            subscription_status: 'active',
            current_period_start: new Date(subscriptionData.current_start * 1000).toISOString(),
            current_period_end: new Date(subscriptionData.current_end * 1000).toISOString(),
          })
          .eq('razorpay_subscription_id', subscriptionData.id);

        if (error) {
          console.error('Error updating subscription:', error);
          throw error;
        }
        break;
      }

      case 'subscription.charged': {
        console.log('Subscription charged:', subscriptionData.id);
        
        // Update expiry date on successful charge
        const plan = subscriptionData.notes?.plan_type || 'monthly';
        const expiryDate = new Date();
        if (plan === 'monthly') {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }

        const { error } = await supabaseClient
          .from('subscriptions')
          .update({
            subscription_status: 'active',
            expiry_date: expiryDate.toISOString(),
            current_period_start: new Date(subscriptionData.current_start * 1000).toISOString(),
            current_period_end: new Date(subscriptionData.current_end * 1000).toISOString(),
          })
          .eq('razorpay_subscription_id', subscriptionData.id);

        if (error) {
          console.error('Error updating subscription:', error);
          throw error;
        }
        break;
      }

      case 'subscription.cancelled': {
        console.log('Subscription cancelled:', subscriptionData.id);
        
        const { error } = await supabaseClient
          .from('subscriptions')
          .update({
            subscription_status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('razorpay_subscription_id', subscriptionData.id);

        if (error) {
          console.error('Error updating subscription:', error);
          throw error;
        }
        break;
      }

      case 'subscription.completed':
      case 'subscription.expired': {
        console.log('Subscription expired:', subscriptionData.id);
        
        const { error } = await supabaseClient
          .from('subscriptions')
          .update({
            subscription_status: 'expired',
          })
          .eq('razorpay_subscription_id', subscriptionData.id);

        if (error) {
          console.error('Error updating subscription:', error);
          throw error;
        }
        break;
      }

      case 'payment.failed': {
        console.log('Payment failed for subscription');
        
        // Mark subscription as expired if payment fails
        if (subscriptionData.id) {
          const { error } = await supabaseClient
            .from('subscriptions')
            .update({
              subscription_status: 'expired',
            })
            .eq('razorpay_subscription_id', subscriptionData.id);

          if (error) {
            console.error('Error updating subscription:', error);
            throw error;
          }
        }
        break;
      }

      default:
        console.log('Unhandled event:', event);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});