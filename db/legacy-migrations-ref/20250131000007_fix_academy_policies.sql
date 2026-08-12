-- Migration: Fix Academy RLS Policies
-- Description: Drop existing policies and recreate them to avoid conflicts

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
DROP POLICY IF EXISTS "Superadmins can manage all courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view lessons" ON public.lessons;
DROP POLICY IF EXISTS "Superadmins can manage all lessons" ON public.lessons;
DROP POLICY IF EXISTS "Anyone can view lesson resources" ON public.lesson_resources;
DROP POLICY IF EXISTS "Superadmins can manage all lesson resources" ON public.lesson_resources;
DROP POLICY IF EXISTS "Anyone can view quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Superadmins can manage all quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Superadmins can manage all quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Superadmins can view all progress" ON public.user_progress;

-- Recreate RLS Policies for courses
CREATE POLICY "Anyone can view courses" 
ON public.courses 
FOR SELECT 
USING (true);

-- Superadmins can manage all courses
CREATE POLICY "Superadmins can manage all courses" 
ON public.courses 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- RLS Policies for lessons
CREATE POLICY "Anyone can view lessons" 
ON public.lessons 
FOR SELECT 
USING (true);

-- Superadmins can manage all lessons
CREATE POLICY "Superadmins can manage all lessons" 
ON public.lessons 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- RLS Policies for lesson_resources
CREATE POLICY "Anyone can view lesson resources" 
ON public.lesson_resources 
FOR SELECT 
USING (true);

-- Superadmins can manage all lesson resources
CREATE POLICY "Superadmins can manage all lesson resources" 
ON public.lesson_resources 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- RLS Policies for quizzes
CREATE POLICY "Anyone can view quizzes" 
ON public.quizzes 
FOR SELECT 
USING (true);

-- Superadmins can manage all quizzes
CREATE POLICY "Superadmins can manage all quizzes" 
ON public.quizzes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- RLS Policies for quiz_questions
CREATE POLICY "Anyone can view quiz questions" 
ON public.quiz_questions 
FOR SELECT 
USING (true);

-- Superadmins can manage all quiz questions
CREATE POLICY "Superadmins can manage all quiz questions" 
ON public.quiz_questions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- RLS Policies for user_progress
-- Users can view their own progress
CREATE POLICY "Users can view their own progress" 
ON public.user_progress 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert their own progress" 
ON public.user_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update their own progress" 
ON public.user_progress 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Superadmins can view all progress
CREATE POLICY "Superadmins can view all progress" 
ON public.user_progress 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

