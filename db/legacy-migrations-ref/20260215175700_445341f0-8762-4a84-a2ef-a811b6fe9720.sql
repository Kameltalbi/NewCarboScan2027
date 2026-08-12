-- 1. Désactiver temporairement le trigger de suppression
ALTER TABLE bilans_carbone DISABLE TRIGGER on_bilan_deleted;

-- 2. Supprimer tous les bilans sauf celui à garder
DELETE FROM bilans_carbone 
WHERE user_id = 'f0df88c8-cb72-47a6-8631-5cc09627a38d' 
AND id != 'a4d4d047-588b-4e1f-8de6-80d2ea078056';

-- 3. Réactiver le trigger
ALTER TABLE bilans_carbone ENABLE TRIGGER on_bilan_deleted;