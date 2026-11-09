-- Hand-applied (Supabase SQL editor), per the standing rule: never db:push.
-- Data only, no schema change. Makes Integration and Data/reporting selectable
-- on the New product definition form. Their discovery questions live in code
-- (src/lib/ai/pathways.ts), so deploying the code first is safe: until this runs,
-- the types simply stay hidden.
-- Idempotent: safe to run twice.
insert into product_types (key, label, category, active)
values
  ('INTEGRATION', 'Integration', 'PRODUCT_TYPE', true),
  ('DATA_REPORTING', 'Data/reporting', 'PRODUCT_TYPE', true)
on conflict (key) do update set active = true;
