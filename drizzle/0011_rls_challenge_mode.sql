-- ============================================================
-- 0011_rls_challenge_mode.sql
-- ============================================================
-- Same one/two-hop tenant_isolation pattern as every other
-- RLS migration in this project -- see claude/rls-migration-notes.md.
-- challenge_reviews is one hop through product_definitions;
-- challenge_findings is two hops, via challenge_reviews, same
-- shape as requirement_dimensions via requirements.

ALTER TABLE public.challenge_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.challenge_reviews;
CREATE POLICY tenant_isolation ON public.challenge_reviews
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.product_definitions pd
    WHERE pd.id = challenge_reviews.product_definition_id
      AND pd.organisation_id = (SELECT public.user_organisation_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.product_definitions pd
    WHERE pd.id = challenge_reviews.product_definition_id
      AND pd.organisation_id = (SELECT public.user_organisation_id())
  ));

ALTER TABLE public.challenge_findings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.challenge_findings;
CREATE POLICY tenant_isolation ON public.challenge_findings
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.challenge_reviews cr
    JOIN public.product_definitions pd ON pd.id = cr.product_definition_id
    WHERE cr.id = challenge_findings.challenge_review_id
      AND pd.organisation_id = (SELECT public.user_organisation_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.challenge_reviews cr
    JOIN public.product_definitions pd ON pd.id = cr.product_definition_id
    WHERE cr.id = challenge_findings.challenge_review_id
      AND pd.organisation_id = (SELECT public.user_organisation_id())
  ));
