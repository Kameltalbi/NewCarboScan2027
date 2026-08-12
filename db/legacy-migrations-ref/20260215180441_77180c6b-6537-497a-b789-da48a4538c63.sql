-- Temporarily disable the deletion trigger
ALTER TABLE bilans_carbone DISABLE TRIGGER on_bilan_deleted;

-- Delete all bilans for the user
DELETE FROM bilans_carbone WHERE id IN ('72a25c70-73f7-4b4f-a40d-3ad52d26afaf', 'a8b0d283-9189-45d0-9556-225f6c466352');

-- Re-enable the trigger
ALTER TABLE bilans_carbone ENABLE TRIGGER on_bilan_deleted;

-- Reset assessment usage
UPDATE user_subscriptions SET assessments_used = 0 WHERE user_id IN (SELECT DISTINCT user_id FROM user_subscriptions);