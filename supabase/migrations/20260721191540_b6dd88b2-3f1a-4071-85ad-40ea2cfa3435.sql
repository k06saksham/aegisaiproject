
-- Profiles
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Supply chain nodes
CREATE TABLE public.nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('supplier','chokepoint','port','refinery','pipeline')),
  country TEXT,
  region TEXT,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  capacity_bpd NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nodes TO authenticated;
GRANT ALL ON public.nodes TO service_role;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Nodes readable by authenticated" ON public.nodes FOR SELECT TO authenticated USING (true);

-- Edges
CREATE TABLE public.edges (
  id TEXT PRIMARY KEY,
  from_node TEXT NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  to_node TEXT NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('sea','pipeline','rail','road')),
  distance_km NUMERIC NOT NULL,
  transit_days NUMERIC NOT NULL DEFAULT 0,
  base_risk NUMERIC NOT NULL DEFAULT 0.1,
  current_risk NUMERIC NOT NULL DEFAULT 0.1,
  disabled BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.edges TO authenticated;
GRANT ALL ON public.edges TO service_role;
ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Edges readable by authenticated" ON public.edges FOR SELECT TO authenticated USING (true);

-- Signals (intel)
CREATE TABLE public.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source TEXT,
  category TEXT NOT NULL CHECK (category IN ('geopolitical','maritime','weather','commodity','sanctions','cyber','other')),
  region TEXT,
  severity NUMERIC NOT NULL DEFAULT 0.5,
  raw_text TEXT,
  analysis JSONB,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','analyzing','analyzed','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  analyzed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signals TO authenticated;
GRANT ALL ON public.signals TO service_role;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signals readable by authenticated" ON public.signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signals insertable by authenticated" ON public.signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Signals updatable by authenticated" ON public.signals FOR UPDATE TO authenticated USING (true);

-- Scenarios
CREATE TABLE public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  scenario_key TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT false,
  impact JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenarios TO authenticated;
GRANT ALL ON public.scenarios TO service_role;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scenarios readable by authenticated" ON public.scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Scenarios manageable by authenticated" ON public.scenarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Recommendations
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signal_id UUID REFERENCES public.signals(id) ON DELETE SET NULL,
  scenario_id UUID REFERENCES public.scenarios(id) ON DELETE SET NULL,
  agent TEXT NOT NULL,
  title TEXT NOT NULL,
  payload JSONB NOT NULL,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendations TO authenticated;
GRANT ALL ON public.recommendations TO service_role;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recs readable by authenticated" ON public.recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Recs insertable by authenticated" ON public.recommendations FOR INSERT TO authenticated WITH CHECK (true);

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  prev_hash TEXT,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit readable by authenticated" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Audit insertable by authenticated" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Seed India-specific energy supply chain network
INSERT INTO public.nodes (id, name, node_type, country, region, lat, lng, capacity_bpd, metadata) VALUES
-- Suppliers (crude producers India imports from)
('sup_saudi', 'Saudi Arabia (Ras Tanura)', 'supplier', 'SA', 'Middle East', 26.64, 50.16, 7000000, '{"grade":"Arab Light","share_india":0.18}'),
('sup_iraq', 'Iraq (Basra)', 'supplier', 'IQ', 'Middle East', 30.51, 47.83, 4500000, '{"grade":"Basra Medium","share_india":0.22}'),
('sup_uae', 'UAE (Fujairah)', 'supplier', 'AE', 'Middle East', 25.11, 56.34, 3200000, '{"grade":"Murban","share_india":0.09}'),
('sup_kuwait', 'Kuwait (Mina Al Ahmadi)', 'supplier', 'KW', 'Middle East', 29.06, 48.16, 2700000, '{"grade":"Kuwait Export","share_india":0.05}'),
('sup_russia', 'Russia (Novorossiysk)', 'supplier', 'RU', 'CIS', 44.72, 37.77, 2500000, '{"grade":"Urals/ESPO","share_india":0.35}'),
('sup_usa', 'USA (Corpus Christi)', 'supplier', 'US', 'Americas', 27.80, -97.39, 3000000, '{"grade":"WTI Midland","share_india":0.04}'),
('sup_nigeria', 'Nigeria (Bonny)', 'supplier', 'NG', 'Africa', 4.43, 7.16, 1800000, '{"grade":"Bonny Light","share_india":0.02}'),
('sup_brazil', 'Brazil (Santos)', 'supplier', 'BR', 'Americas', -23.98, -46.31, 1500000, '{"grade":"Tupi","share_india":0.03}'),
-- Chokepoints
('cp_hormuz', 'Strait of Hormuz', 'chokepoint', 'INT', 'Middle East', 26.57, 56.25, 21000000, '{"share_global_seaborne":0.30,"share_india_imports":0.42}'),
('cp_babelmandeb', 'Bab-el-Mandeb', 'chokepoint', 'INT', 'Red Sea', 12.58, 43.33, 6200000, '{"share_global_seaborne":0.09}'),
('cp_suez', 'Suez Canal', 'chokepoint', 'INT', 'Red Sea', 30.42, 32.35, 5500000, '{"share_global_seaborne":0.08}'),
('cp_malacca', 'Strait of Malacca', 'chokepoint', 'INT', 'SE Asia', 2.50, 101.30, 16000000, '{"share_global_seaborne":0.23}'),
-- Indian ports
('port_jamnagar', 'Jamnagar (Sikka)', 'port', 'IN', 'India-West', 22.47, 69.83, 1400000, '{}'),
('port_mundra', 'Mundra', 'port', 'IN', 'India-West', 22.83, 69.72, 900000, '{}'),
('port_kandla', 'Kandla', 'port', 'IN', 'India-West', 23.02, 70.22, 700000, '{}'),
('port_vizag', 'Visakhapatnam', 'port', 'IN', 'India-East', 17.68, 83.22, 500000, '{}'),
('port_paradip', 'Paradip', 'port', 'IN', 'India-East', 20.26, 86.67, 400000, '{}'),
('port_chennai', 'Chennai', 'port', 'IN', 'India-South', 13.10, 80.29, 350000, '{}'),
-- Refineries
('ref_jamnagar', 'RIL Jamnagar Refinery', 'refinery', 'IN', 'India-West', 22.35, 69.85, 1360000, '{"operator":"Reliance","complexity":"very high"}'),
('ref_vadinar', 'Nayara Vadinar Refinery', 'refinery', 'IN', 'India-West', 22.47, 69.72, 405000, '{"operator":"Nayara"}'),
('ref_mumbai', 'BPCL/HPCL Mumbai', 'refinery', 'IN', 'India-West', 19.02, 72.87, 360000, '{"operator":"BPCL+HPCL"}'),
('ref_koyali', 'IOCL Koyali (Gujarat)', 'refinery', 'IN', 'India-West', 22.35, 73.15, 275000, '{"operator":"IOCL"}'),
('ref_vizag', 'HPCL Visakhapatnam', 'refinery', 'IN', 'India-East', 17.72, 83.30, 166000, '{"operator":"HPCL"}'),
('ref_paradip', 'IOCL Paradip', 'refinery', 'IN', 'India-East', 20.28, 86.62, 300000, '{"operator":"IOCL"}'),
('ref_chennai', 'CPCL Manali (Chennai)', 'refinery', 'IN', 'India-South', 13.16, 80.27, 210000, '{"operator":"CPCL"}');

-- Seed edges (routes)
-- Middle East → Hormuz → India West
INSERT INTO public.edges (id, from_node, to_node, mode, distance_km, transit_days, base_risk, current_risk) VALUES
('e_saudi_hormuz','sup_saudi','cp_hormuz','sea',900,2.5,0.15,0.32),
('e_iraq_hormuz','sup_iraq','cp_hormuz','sea',700,2.0,0.15,0.38),
('e_uae_hormuz','sup_uae','cp_hormuz','sea',150,0.5,0.15,0.30),
('e_kuwait_hormuz','sup_kuwait','cp_hormuz','sea',600,1.8,0.15,0.31),
('e_hormuz_jamnagar','cp_hormuz','port_jamnagar','sea',1900,5.5,0.10,0.28),
('e_hormuz_mundra','cp_hormuz','port_mundra','sea',1950,5.6,0.10,0.28),
('e_hormuz_kandla','cp_hormuz','port_kandla','sea',1900,5.5,0.10,0.28),
('e_hormuz_vizag','cp_hormuz','port_vizag','sea',4200,12,0.10,0.25),
-- Africa/Med → Bab-el-Mandeb → Suez → West India
('e_nigeria_bam','sup_nigeria','cp_babelmandeb','sea',7500,20,0.20,0.55),
('e_bam_suez','cp_babelmandeb','cp_suez','sea',2000,5.5,0.15,0.62),
('e_suez_jamnagar','cp_suez','port_jamnagar','sea',4900,14,0.15,0.50),
-- Russia → Novorossiysk → Suez → India (or via Bosphorus, simplified)
('e_russia_suez','sup_russia','cp_suez','sea',2600,7,0.18,0.40),
-- Americas → Malacca → India East
('e_usa_malacca','sup_usa','cp_malacca','sea',17000,42,0.12,0.20),
('e_brazil_malacca','sup_brazil','cp_malacca','sea',16000,40,0.12,0.20),
('e_malacca_vizag','cp_malacca','port_vizag','sea',2600,7.5,0.10,0.18),
('e_malacca_chennai','cp_malacca','port_chennai','sea',2400,7,0.10,0.18),
('e_malacca_paradip','cp_malacca','port_paradip','sea',2900,8.5,0.10,0.18),
-- Ports → refineries (pipeline/short-haul)
('e_jamnagar_ref','port_jamnagar','ref_jamnagar','pipeline',20,0.1,0.05,0.05),
('e_jamnagar_vadinar','port_jamnagar','ref_vadinar','pipeline',15,0.1,0.05,0.05),
('e_mundra_koyali','port_mundra','ref_koyali','pipeline',700,1.5,0.08,0.10),
('e_kandla_koyali','port_kandla','ref_koyali','pipeline',400,1,0.08,0.10),
('e_mundra_mumbai','port_mundra','ref_mumbai','sea',600,1.8,0.08,0.12),
('e_vizag_refv','port_vizag','ref_vizag','pipeline',10,0.1,0.05,0.05),
('e_paradip_ref','port_paradip','ref_paradip','pipeline',5,0.05,0.05,0.05),
('e_chennai_ref','port_chennai','ref_chennai','pipeline',20,0.1,0.05,0.05);

-- Seed a couple of active signals (illustrative)
INSERT INTO public.signals (title, source, category, region, severity, raw_text, status) VALUES
('Houthi drone strike disables tanker in Bab-el-Mandeb', 'Reuters (simulated)', 'maritime', 'Red Sea', 0.82, 'A crude tanker was struck by a drone in the Bab-el-Mandeb strait, forcing rerouting via Cape of Good Hope. Insurance premiums for Red Sea transits up 340%.', 'new'),
('Iran IRGC statement threatens Hormuz transit', 'AP (simulated)', 'geopolitical', 'Middle East', 0.68, 'Iranian Revolutionary Guard commander warned of "closing all shipping lanes" if sanctions escalate. Historical base rate for follow-through low but non-zero.', 'new'),
('Brent crude jumps 6.2% intraday on Middle East risk', 'ICE (simulated)', 'commodity', 'Global', 0.55, 'Front-month Brent futures rose from $82 to $87.10 in London trading as Middle East risk premium re-priced.', 'new');
