
-- audit_log: owner-only
DROP POLICY IF EXISTS "Audit readable by authenticated" ON public.audit_log;
DROP POLICY IF EXISTS "Audit insertable by authenticated" ON public.audit_log;
CREATE POLICY "Audit readable by owner" ON public.audit_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Audit insertable by owner" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- recommendations: owner-only reads
DROP POLICY IF EXISTS "Recs readable by authenticated" ON public.recommendations;
DROP POLICY IF EXISTS "Recs insertable by authenticated" ON public.recommendations;
CREATE POLICY "Recs readable by owner" ON public.recommendations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Recs insertable by owner" ON public.recommendations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- scenarios: keep readable to all authenticated, but manage only own
DROP POLICY IF EXISTS "Scenarios manageable by authenticated" ON public.scenarios;
CREATE POLICY "Scenarios insertable by owner" ON public.scenarios
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Scenarios updatable by owner" ON public.scenarios
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Scenarios deletable by owner" ON public.scenarios
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- signals: owner-only read/update; insert must set self
DROP POLICY IF EXISTS "Signals readable by authenticated" ON public.signals;
DROP POLICY IF EXISTS "Signals updatable by authenticated" ON public.signals;
DROP POLICY IF EXISTS "Signals insertable by authenticated" ON public.signals;
CREATE POLICY "Signals readable by owner" ON public.signals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Signals updatable by owner" ON public.signals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Signals insertable by owner" ON public.signals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- profiles: owner-only reads
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Profiles readable by owner" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
