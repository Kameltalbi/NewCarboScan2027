-- Corriger l'item Steel existant pour utiliser le bon facteur
UPDATE acv_inventory SET item = 'Steel_metric_ton' WHERE item = 'Steel' AND unit = 't';