import React, { useState, useEffect } from 'react';
import { AcademyCard, Course } from '@/components/academy/AcademyCard';
import { supabase } from "@/integrations/api/client";
import { Loader2 } from 'lucide-react';
import { ModuleLayout } from '@/modules/shared/ModuleLayout';

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  duration: string | null;
  level: string | null;
  created_at: string;
}

const AcademyCatalogPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch courses with lesson count
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
    } catch (err: any) {
      console.error('Error fetching courses:', err);
      setError(err.message || 'Erreur lors du chargement des formations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ModuleLayout moduleSlug="academy">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#009879] mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement du catalogue...</p>
          </div>
        </div>
      </ModuleLayout>
    );
  }

  if (error) {
    return (
      <ModuleLayout moduleSlug="academy">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchCourses}
              className="text-[#009879] hover:underline"
            >
              Réessayer
            </button>
          </div>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout moduleSlug="academy">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            CarboScan Academy
          </h1>
          <p className="text-muted-foreground">
            Découvrez nos formations pour maîtriser le bilan carbone et la décarbonation
          </p>
        </div>

        {/* Courses Grid */}
        {courses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Aucune formation disponible pour le moment.
            </p>
            <p className="text-sm text-muted-foreground">
              Les formations seront ajoutées prochainement.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <AcademyCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </ModuleLayout>
  );
};

export default AcademyCatalogPage;
