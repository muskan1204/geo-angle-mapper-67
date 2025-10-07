-- Drop the has_active_subscription function
DROP FUNCTION IF EXISTS public.has_active_subscription(uuid);

-- Drop the subscriptions table
DROP TABLE IF EXISTS public.subscriptions;

-- Drop the subscription_status enum type if it exists
DROP TYPE IF EXISTS public.subscription_status;

-- Drop the subscription_plan enum type if it exists
DROP TYPE IF EXISTS public.subscription_plan;