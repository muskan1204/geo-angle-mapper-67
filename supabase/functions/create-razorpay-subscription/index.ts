import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { plan } = await req.json();
    console.log('Creating subscription for user:', user.id, 'plan:', plan);

    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    // Create or fetch Razorpay customer
    const customerResponse = await fetch('https://api.razorpay.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: user.user_metadata?.full_name || user.email,
        email: user.email,
        notes: {
          user_id: user.id,
        },
      }),
    });

    if (!customerResponse.ok) {
      const error = await customerResponse.text();
      console.error('Customer creation failed:', error);
      throw new Error('Failed to create customer');
    }

    const customer = await customerResponse.json();
    console.log('Customer created:', customer.id);

    // Plan details: monthly ₹100, yearly ₹1000
    const planAmount = plan === 'monthly' ? 10000 : 100000; // in paise
    const planInterval = plan === 'monthly' ? 1 : 12;
    const planPeriod = 'monthly'; // both use monthly period, yearly just has 12 intervals

    // Create Razorpay plan
    const razorpayPlanResponse = await fetch('https://api.razorpay.com/v1/plans', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        period: planPeriod,
        interval: planInterval,
        item: {
          name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Subscription`,
          amount: planAmount,
          currency: 'INR',
          description: `${plan} subscription plan`,
        },
        notes: {
          plan_type: plan,
        },
      }),
    });

    if (!razorpayPlanResponse.ok) {
      const error = await razorpayPlanResponse.text();
      console.error('Plan creation failed:', error);
      throw new Error('Failed to create plan');
    }

    const razorpayPlan = await razorpayPlanResponse.json();
    console.log('Plan created:', razorpayPlan.id);

    // Create subscription
    const subscriptionResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: razorpayPlan.id,
        customer_id: customer.id,
        total_count: 12, // Will auto-renew 12 times
        quantity: 1,
        customer_notify: 1,
        notes: {
          user_id: user.id,
          plan_type: plan,
        },
      }),
    });

    if (!subscriptionResponse.ok) {
      const error = await subscriptionResponse.text();
      console.error('Subscription creation failed:', error);
      throw new Error('Failed to create subscription');
    }

    const subscription = await subscriptionResponse.json();
    console.log('Subscription created:', subscription.id);

    // Calculate expiry date
    const expiryDate = new Date();
    if (plan === 'monthly') {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    // Store subscription in database
    const { data: dbSubscription, error: dbError } = await supabaseClient
      .from('subscriptions')
      .insert({
        user_id: user.id,
        razorpay_subscription_id: subscription.id,
        razorpay_customer_id: customer.id,
        subscription_plan: plan,
        subscription_status: 'pending',
        expiry_date: expiryDate.toISOString(),
        current_period_start: new Date(subscription.current_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_end * 1000).toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('Subscription stored in database:', dbSubscription.id);

    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        short_url: subscription.short_url,
        razorpay_key: RAZORPAY_KEY_ID,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});