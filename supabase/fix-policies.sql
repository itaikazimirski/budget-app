-- ============================================================
-- Run this in Supabase SQL Editor to fix missing policies
-- ============================================================

-- Helper function
CREATE OR REPLACE FUNCTION is_account_member(p_account_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM account_members
    WHERE account_id = p_account_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS (safe to run even if already enabled)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE month_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "view own accounts" ON accounts;
DROP POLICY IF EXISTS "create accounts" ON accounts;
DROP POLICY IF EXISTS "update own accounts" ON accounts;
DROP POLICY IF EXISTS "delete own accounts" ON accounts;
DROP POLICY IF EXISTS "view members" ON account_members;
DROP POLICY IF EXISTS "add members" ON account_members;
DROP POLICY IF EXISTS "remove members" ON account_members;
DROP POLICY IF EXISTS "view categories" ON categories;
DROP POLICY IF EXISTS "manage categories" ON categories;
DROP POLICY IF EXISTS "manage budget templates" ON budget_templates;
DROP POLICY IF EXISTS "manage month budgets" ON month_budgets;
DROP POLICY IF EXISTS "view transactions" ON transactions;
DROP POLICY IF EXISTS "create transactions" ON transactions;
DROP POLICY IF EXISTS "update transactions" ON transactions;
DROP POLICY IF EXISTS "delete transactions" ON transactions;

-- Recreate all policies
CREATE POLICY "view own accounts" ON accounts FOR SELECT USING (is_account_member(id));
CREATE POLICY "create accounts" ON accounts FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "update own accounts" ON accounts FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "delete own accounts" ON accounts FOR DELETE USING (created_by = auth.uid());

CREATE POLICY "view members" ON account_members FOR SELECT USING (is_account_member(account_id));
CREATE POLICY "add members" ON account_members FOR INSERT WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM accounts WHERE id = account_id AND created_by = auth.uid())
);
CREATE POLICY "remove members" ON account_members FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM accounts WHERE id = account_id AND created_by = auth.uid())
);

CREATE POLICY "view categories" ON categories FOR SELECT USING (is_account_member(account_id));
CREATE POLICY "manage categories" ON categories FOR ALL USING (is_account_member(account_id));
CREATE POLICY "manage budget templates" ON budget_templates FOR ALL USING (is_account_member(account_id));
CREATE POLICY "manage month budgets" ON month_budgets FOR ALL USING (is_account_member(account_id));

CREATE POLICY "view transactions" ON transactions FOR SELECT USING (is_account_member(account_id));
CREATE POLICY "create transactions" ON transactions FOR INSERT WITH CHECK (
  is_account_member(account_id) AND user_id = auth.uid()
);
CREATE POLICY "update transactions" ON transactions FOR UPDATE USING (is_account_member(account_id));
CREATE POLICY "delete transactions" ON transactions FOR DELETE USING (is_account_member(account_id));
