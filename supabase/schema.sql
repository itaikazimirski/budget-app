-- ============================================================
-- Kaspit Budget App - Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Accounts
CREATE TABLE accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('personal', 'shared')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Account members (who has access to each account)
CREATE TABLE account_members (
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  PRIMARY KEY (account_id, user_id)
);

-- Categories (income or expense, per account)
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Master budget template (default monthly amounts per category)
CREATE TABLE budget_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  monthly_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  UNIQUE(account_id, category_id)
);

-- Monthly overrides (when a specific month differs from the template)
CREATE TABLE month_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  monthly_amount NUMERIC(12, 2) NOT NULL,
  UNIQUE(account_id, category_id, year, month)
);

-- Transactions (every income/expense entry)
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys for Apple Shortcuts integration
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'iPhone Shortcut',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- Only members of an account can see/edit its data
-- ============================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE month_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is a member of an account
CREATE OR REPLACE FUNCTION is_account_member(p_account_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM account_members
    WHERE account_id = p_account_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Accounts policies
CREATE POLICY "view own accounts" ON accounts FOR SELECT USING (is_account_member(id));
CREATE POLICY "create accounts" ON accounts FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "update own accounts" ON accounts FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "delete own accounts" ON accounts FOR DELETE USING (created_by = auth.uid());

-- Account members policies
CREATE POLICY "view members" ON account_members FOR SELECT USING (is_account_member(account_id));
CREATE POLICY "add members" ON account_members FOR INSERT WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM accounts WHERE id = account_id AND created_by = auth.uid())
);
CREATE POLICY "remove members" ON account_members FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM accounts WHERE id = account_id AND created_by = auth.uid())
);

-- Categories policies
CREATE POLICY "view categories" ON categories FOR SELECT USING (is_account_member(account_id));
CREATE POLICY "manage categories" ON categories FOR ALL USING (is_account_member(account_id));

-- Budget templates policies
CREATE POLICY "manage budget templates" ON budget_templates FOR ALL USING (is_account_member(account_id));

-- Month budgets policies
CREATE POLICY "manage month budgets" ON month_budgets FOR ALL USING (is_account_member(account_id));

-- Transactions policies
CREATE POLICY "view transactions" ON transactions FOR SELECT USING (is_account_member(account_id));
CREATE POLICY "create transactions" ON transactions FOR INSERT WITH CHECK (
  is_account_member(account_id) AND user_id = auth.uid()
);
CREATE POLICY "update transactions" ON transactions FOR UPDATE USING (is_account_member(account_id));
CREATE POLICY "delete transactions" ON transactions FOR DELETE USING (is_account_member(account_id));

-- API keys policies
CREATE POLICY "manage api keys" ON api_keys FOR ALL USING (user_id = auth.uid());
