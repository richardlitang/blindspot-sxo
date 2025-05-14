-- Blindspot Database Schema
-- Run this in Supabase SQL Editor

-- Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  credits_balance INTEGER NOT NULL DEFAULT 3,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'builder', 'agency')),
  lemonsqueezy_customer_id TEXT,
  lemonsqueezy_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Audits table (history of all analyses)
CREATE TABLE IF NOT EXISTS public.audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  grade TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('professional', 'conversion', 'roast')),
  json_result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- Audits policies
CREATE POLICY "Users can view own audits"
  ON public.audits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audits"
  ON public.audits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS audits_user_id_idx ON public.audits(user_id);
CREATE INDEX IF NOT EXISTS audits_created_at_idx ON public.audits(created_at DESC);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, credits_balance, tier)
  VALUES (NEW.id, 3, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
