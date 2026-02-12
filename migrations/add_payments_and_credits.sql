-- Migration: Add payment and credit system tables
-- Run this in your Supabase SQL editor

-- User credits: tracks how many interview attempts a user has per stage
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stage TEXT NOT NULL, -- 'hiring_manager', 'culture_fit', 'final'
  credits_remaining INTEGER DEFAULT 0, -- each credit = 1 interview attempt
  bundle_purchased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, stage)
);

-- Payment transactions: records of all payments
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  product_type TEXT NOT NULL, -- 'single_hm', 'single_cf', 'single_fr', 'bundle_3', 'bundle_2_no_cf', 'subscription'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'refunded', 'failed'
  metadata JSONB, -- additional info like which stages were unlocked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions: for monthly subscribers
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT DEFAULT 'inactive', -- 'active', 'canceled', 'past_due', 'inactive'
  plan_type TEXT DEFAULT 'monthly', -- 'monthly', 'annual'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  interview_count_this_period INTEGER DEFAULT 0,
  max_interviews_per_period INTEGER DEFAULT 5, -- anti-abuse cap
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User resumes: multiple resume versions per user
CREATE TABLE IF NOT EXISTS public.user_resumes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT DEFAULT 'My Resume',
  file_url TEXT, -- Supabase Storage URL (if uploaded)
  resume_text TEXT NOT NULL, -- extracted text
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HR screen completion tracking (for free tier limits)
-- Tracks how many free HR screens a user or anonymous visitor has done
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS hr_screen_completions INTEGER DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS free_hr_retakes_used INTEGER DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_resumes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_credits
CREATE POLICY "Users can view own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits"
  ON public.user_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON public.user_credits FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view own payments"
  ON public.payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for user_resumes
CREATE POLICY "Users can view own resumes"
  ON public.user_resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes"
  ON public.user_resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes"
  ON public.user_resumes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
  ON public.user_resumes FOR DELETE
  USING (auth.uid() = user_id);
