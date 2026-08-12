import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/api/client";
import { Course } from '@/components/academy/AcademyCard';

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  duration: string | null;
  level: string | null;
  created_at: string;
}

export const useAcademyCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: coursesData, error: coursesError } = await (supabase
        .from('courses' as any)
        .select('id, title, description, duration, level, created_at')
        .order('created_at', { ascending: false }) as unknown as Promise<{ data: CourseRow[] | null; error: any }>);

      if (coursesError) throw coursesError;

      // Fetch lesson counts for each course
      const coursesWithCounts = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { count } = await (supabase
            .from('lessons' as any)
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id) as unknown as Promise<{ count: number | null; error: any }>);

          return {
            ...course,
            lessons_count: count || 0
          };
        })
      );

      setCourses(coursesWithCounts);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return {
    courses,
    loading,
    error,
    refetch: fetchCourses
  };
};
