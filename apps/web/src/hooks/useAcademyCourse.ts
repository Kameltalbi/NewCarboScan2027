import { useState, useEffect } from 'react';
import { supabase, sessionAuth} from "@/integrations/api/client";
import { Lesson } from '@/components/academy/LessonStepSidebar';

interface Course {
  id: string;
  title: string;
  description: string | null;
  duration: string | null;
  level: string | null;
}

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  duration: string | null;
  level: string | null;
}

interface LessonRow {
  id: string;
  title: string;
  order_index: number;
}

interface ProgressRow {
  lesson_id: string;
  is_completed: boolean;
}

export const useAcademyCourse = (courseId: string | undefined) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  const fetchCourse = async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch course - cast to unknown first then to expected type
      const { data: courseData, error: courseError } = await (supabase
        .from('courses' as any)
        .select('*')
        .eq('id', courseId)
        .single() as unknown as Promise<{ data: CourseRow | null; error: any }>);

      if (courseError) throw courseError;
      if (courseData) {
        setCourse(courseData);
      }

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await (supabase
        .from('lessons' as any)
        .select('id, title, order_index')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true }) as unknown as Promise<{ data: LessonRow[] | null; error: any }>);

      if (lessonsError) throw lessonsError;

      // Fetch user progress
      const { data: { user } } = await sessionAuth.getUser();
      if (user) {
        const { data: progressData } = await (supabase
          .from('user_progress' as any)
          .select('lesson_id, is_completed')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('is_completed', true) as unknown as Promise<{ data: ProgressRow[] | null; error: any }>);

        const completedLessonIds = new Set(progressData?.map(p => p.lesson_id) || []);

        setLessons(
          (lessonsData || []).map(lesson => ({
            ...lesson,
            is_completed: completedLessonIds.has(lesson.id)
          }))
        );
      } else {
        setLessons(lessonsData || []);
      }
    } catch (err) {
      console.error('Error fetching course:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return {
    course,
    lessons,
    loading,
    error,
    refetch: fetchCourse
  };
};
