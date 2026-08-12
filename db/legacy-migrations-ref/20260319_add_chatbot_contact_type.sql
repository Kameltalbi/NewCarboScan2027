-- Add chatbot_contact type to contact_requests table
ALTER TABLE public.contact_requests DROP CONSTRAINT IF EXISTS contact_requests_request_type_check;

ALTER TABLE public.contact_requests
ADD CONSTRAINT contact_requests_request_type_check
CHECK (
  request_type = ANY (
    ARRAY[
      'general'::text,
      'quote'::text,
      'demo'::text,
      'support'::text,
      'pricing'::text,
      'guide_download'::text,
      'chatbot_contact'::text
    ]
  )
);
