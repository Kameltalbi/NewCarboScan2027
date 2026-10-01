-- L'historique d'une suppression doit conserver l'identifiant après la disparition de la ligne.
-- La clé étrangère empêchait le DELETE : l'insert d'historique arrivait une fois la ligne déjà partie.

ALTER TABLE activity_data_history
  DROP CONSTRAINT IF EXISTS activity_data_history_activity_data_id_fkey;
