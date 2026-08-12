ALTER TABLE bilans_carbone DISABLE TRIGGER on_bilan_deleted;

DELETE FROM bilans_carbone WHERE user_id = 'f0df88c8-cb72-47a6-8631-5cc09627a38d';

ALTER TABLE bilans_carbone ENABLE TRIGGER on_bilan_deleted;

UPDATE user_subscriptions SET assessments_used = 0 WHERE user_id = 'f0df88c8-cb72-47a6-8631-5cc09627a38d';