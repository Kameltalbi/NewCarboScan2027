-- Create chatbot_feedback table to track user satisfaction and improve responses
CREATE TABLE IF NOT EXISTS public.chatbot_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_feedback ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own feedback" ON public.chatbot_feedback
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert feedback" ON public.chatbot_feedback
FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_chatbot_feedback_user_id ON public.chatbot_feedback(user_id);
CREATE INDEX idx_chatbot_feedback_session_id ON public.chatbot_feedback(session_id);
CREATE INDEX idx_chatbot_feedback_type ON public.chatbot_feedback(feedback_type);
CREATE INDEX idx_chatbot_feedback_created_at ON public.chatbot_feedback(created_at DESC);

-- Comment
COMMENT ON TABLE public.chatbot_feedback IS 'Stores user feedback on chatbot responses to improve AI quality';
