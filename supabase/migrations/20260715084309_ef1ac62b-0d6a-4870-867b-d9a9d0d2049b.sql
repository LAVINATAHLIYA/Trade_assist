
-- Enums
CREATE TYPE public.trade_direction AS ENUM ('long','short','non_directional');
CREATE TYPE public.trade_instrument AS ENUM ('equity','equity_mtf','futures','options');
CREATE TYPE public.trade_duration AS ENUM ('intraday','swing','positional_weekly','positional_monthly');
CREATE TYPE public.trade_status AS ENUM ('open','closed','cancelled');
CREATE TYPE public.trade_grade AS ENUM ('A+','A','B','C','D','F');

-- Trades
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  direction public.trade_direction NOT NULL DEFAULT 'long',
  instrument public.trade_instrument NOT NULL DEFAULT 'equity',
  duration public.trade_duration NOT NULL DEFAULT 'swing',
  status public.trade_status NOT NULL DEFAULT 'open',
  quantity NUMERIC NOT NULL DEFAULT 0,
  entry_price NUMERIC NOT NULL DEFAULT 0,
  exit_price NUMERIC,
  stop_loss NUMERIC,
  target_price NUMERIC,
  target_2 NUMERIC,
  target_3 NUMERIC,
  entry_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  exit_time TIMESTAMPTZ,
  strategy TEXT,
  setup TEXT,
  timeframe TEXT,
  market_trend TEXT,
  market_alignment TEXT,
  trade_type TEXT,
  source TEXT,
  option_strategy TEXT,
  event_context TEXT,
  rationale TEXT,
  risk_amount NUMERIC,
  planned_reward NUMERIC,
  planned_r NUMERIC,
  confidence_before SMALLINT,
  focus_before SMALLINT,
  stress_before SMALLINT,
  energy_before SMALLINT,
  fomo BOOLEAN DEFAULT false,
  revenge BOOLEAN DEFAULT false,
  followed_plan BOOLEAN,
  emotion_before TEXT,
  emotion_after TEXT,
  entry_quality SMALLINT,
  exit_quality SMALLINT,
  risk_mgmt_quality SMALLINT,
  execution_quality SMALLINT,
  what_went_well TEXT,
  what_went_wrong TEXT,
  lessons TEXT,
  mistakes TEXT[] DEFAULT '{}',
  playbook_id UUID,
  charges NUMERIC DEFAULT 0,
  pnl_realized NUMERIC,
  tags TEXT[] DEFAULT '{}',
  sector TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX trades_user_id_idx ON public.trades(user_id);
CREATE INDEX trades_status_idx ON public.trades(user_id, status);
CREATE INDEX trades_entry_time_idx ON public.trades(user_id, entry_time DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trades TO authenticated;
GRANT ALL ON public.trades TO service_role;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trades" ON public.trades FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Strategies (playbook)
CREATE TABLE public.strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  market_condition TEXT,
  instrument public.trade_instrument,
  timeframe TEXT,
  entry_rules TEXT,
  confirmation_rules TEXT,
  stop_loss_rule TEXT,
  target_rule TEXT,
  sizing_rule TEXT,
  exit_rule TEXT,
  max_risk NUMERIC,
  common_mistakes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategies TO authenticated;
GRANT ALL ON public.strategies TO service_role;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own strategies" ON public.strategies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reviews
CREATE TABLE public.trade_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  grade public.trade_grade,
  thesis TEXT,
  entry_notes TEXT,
  exit_notes TEXT,
  risk_notes TEXT,
  psychology_notes TEXT,
  ai_review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_reviews TO authenticated;
GRANT ALL ON public.trade_reviews TO service_role;
ALTER TABLE public.trade_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reviews" ON public.trade_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Attachments
CREATE TABLE public.trade_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'other',
  url TEXT NOT NULL,
  filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_attachments TO authenticated;
GRANT ALL ON public.trade_attachments TO service_role;
ALTER TABLE public.trade_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attachments" ON public.trade_attachments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_trades_updated BEFORE UPDATE ON public.trades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_strategies_updated BEFORE UPDATE ON public.strategies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.trade_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
