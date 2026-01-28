-- Remove historical funnel event types that are no longer reliable.
-- The admin funnel now only tracks `account_created`, so delete prior entries for email/first-login/onboarding/product-tour.

DELETE FROM user_events
WHERE event_type IN (
  'email_verified',
  'first_login',
  'onboarding_started',
  'onboarding_completed',
  'product_tour_started',
  'product_tour_completed'
);

COMMENT ON TABLE user_events IS 'Tracks user progression through onboarding funnel and key product milestones.';
