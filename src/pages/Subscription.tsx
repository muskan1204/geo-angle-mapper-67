import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Crown } from 'lucide-react';

interface Subscription {
  id: string;
  subscription_plan: 'monthly' | 'yearly';
  subscription_status: 'active' | 'cancelled' | 'expired' | 'pending';
  razorpay_subscription_id: string;
  expiry_date: string;
  current_period_end: string;
}

const Subscription = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    fetchSubscription();

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          navigate('/auth');
        } else {
          setUser(session.user);
          fetchSubscription();
        }
      }
    );

    return () => {
      authSubscription.unsubscribe();
    };
  }, [navigate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    } else {
      setUser(session.user);
    }
  };

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setSubscription(data);
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-razorpay-subscription', {
        body: { plan },
      });

      if (error) throw error;

      // Open Razorpay payment page
      if (data.short_url) {
        window.location.href = data.short_url;
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create subscription',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create subscription',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription?.razorpay_subscription_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-razorpay-subscription', {
        body: { subscription_id: subscription.razorpay_subscription_id },
      });

      if (error) throw error;

      toast({
        title: 'Subscription cancelled',
        description: data.message,
      });

      fetchSubscription();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isActive = subscription?.subscription_status === 'active' && 
    new Date(subscription.expiry_date) >= new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Subscription Plans</h1>
          <p className="text-muted-foreground">Choose the plan that works best for you</p>
        </div>

        {subscription && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Current Subscription
                {isActive ? (
                  <Badge variant="default" className="ml-2">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="ml-2">
                    <XCircle className="w-3 h-3 mr-1" />
                    {subscription.subscription_status}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-semibold capitalize">{subscription.subscription_plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expires:</span>
                <span className="font-semibold">
                  {new Date(subscription.expiry_date).toLocaleDateString()}
                </span>
              </div>
              {subscription.subscription_status === 'active' && (
                <Button
                  onClick={handleCancel}
                  variant="destructive"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Cancelling...' : 'Cancel Subscription'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {(!subscription || !isActive) && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  Monthly Plan
                </CardTitle>
                <CardDescription>Perfect for short-term needs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-4xl font-bold">₹100<span className="text-lg text-muted-foreground">/month</span></div>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Full access to all features
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Auto-renewal every month
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Cancel anytime
                  </li>
                </ul>
                <Button
                  onClick={() => handleSubscribe('monthly')}
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Subscribe Monthly'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary hover:border-primary/70 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  Yearly Plan
                  <Badge className="ml-2">Save 17%</Badge>
                </CardTitle>
                <CardDescription>Best value for long-term use</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-4xl font-bold">₹1000<span className="text-lg text-muted-foreground">/year</span></div>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Full access to all features
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Auto-renewal every year
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Cancel anytime
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Save ₹200 per year
                  </li>
                </ul>
                <Button
                  onClick={() => handleSubscribe('yearly')}
                  className="w-full"
                  disabled={loading}
                  variant="default"
                >
                  {loading ? 'Processing...' : 'Subscribe Yearly'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Subscription;