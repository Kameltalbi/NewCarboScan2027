-- Fix the stored validated_pdf_url to use clean object path instead of expired signed URL
UPDATE bilans_carbone
SET validated_pdf_url = 'bilans/8506b52d-7886-4272-8c8f-c653768603bf/rapport-valide-1772281386229.pdf'
WHERE id = '8506b52d-7886-4272-8c8f-c653768603bf'
AND validated_pdf_url LIKE 'https://%';