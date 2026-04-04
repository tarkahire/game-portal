-- Fix: armies and army_units had RLS enabled but no policies (blocking all reads)

CREATE POLICY "armies_select" ON armies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "armies_insert" ON armies FOR INSERT WITH CHECK (true);
CREATE POLICY "armies_update" ON armies FOR UPDATE USING (true);
CREATE POLICY "armies_delete" ON armies FOR DELETE USING (true);

CREATE POLICY "army_units_select" ON army_units FOR SELECT USING (true);
CREATE POLICY "army_units_insert" ON army_units FOR INSERT WITH CHECK (true);
CREATE POLICY "army_units_update" ON army_units FOR UPDATE USING (true);
CREATE POLICY "army_units_delete" ON army_units FOR DELETE USING (true);
