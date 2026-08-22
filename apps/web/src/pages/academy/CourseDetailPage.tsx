import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ModuleLayout } from '@/modules/shared/ModuleLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Clock, BookOpen, Target, ArrowLeft, Play } from 'lucide-react';
import { supabase, sessionAuth} from "@/integrations/api/client";
import { Loader2 } from 'lucide-react';
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

const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId]);

  const fetchCourseDetails = async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch course
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

      // Fetch user progress to mark completed lessons
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
    } catch (err: any) {
      console.error('Error fetching course details:', err);
      setError(err.message || 'Erreur lors du chargement de la formation');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCourse = () => {
    if (lessons.length > 0) {
      navigate(`/app/academy/${courseId}/${lessons[0].id}`);
    }
  };

  if (loading) {
    return (
      <ModuleLayout moduleSlug="academy">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#009879] mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement de la formation...</p>
          </div>
        </div>
      </ModuleLayout>
    );
  }

  if (error || !course) {
    return (
      <ModuleLayout moduleSlug="academy">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || 'Formation non trouvée'}</p>
            <Button onClick={() => navigate('/app/academy')} variant="outline">
              Retour au catalogue
            </Button>
          </div>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout moduleSlug="academy">
      <div className="space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/app/academy')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au catalogue
        </Button>

        {/* Course Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-3xl">{course.title}</CardTitle>
                  {course.level && (
                    <Badge variant="secondary">{course.level}</Badge>
                  )}
                </div>
                <CardDescription className="text-base mt-2">
                  {course.description || 'Description à venir...'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
              {course.duration && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{course.duration}</span>
                </div>
              )}
              {lessons.length > 0 && (
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{lessons.length} module{lessons.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            <Button
              onClick={handleStartCourse}
              disabled={lessons.length === 0}
              className="bg-[#009879] hover:bg-[#007a63]"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              {lessons.length > 0 ? 'Commencer la formation' : 'Aucun module disponible'}
            </Button>
          </CardContent>
        </Card>

        {/* Learning Objectives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#009879]" />
              Objectifs d'apprentissage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground italic">
              Les objectifs d'apprentissage seront définis ici.
            </p>
          </CardContent>
        </Card>

        {/* Lessons List */}
        {lessons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Modules de la formation</CardTitle>
              <CardDescription>
                {lessons.length} module{lessons.length > 1 ? 's' : ''} au total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {lessons.map((lesson) => (
                  <AccordionItem key={lesson.id} value={`lesson-${lesson.id}`}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-3 text-left">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#009879] text-white font-semibold text-sm">
                          {lesson.order_index}
                        </span>
                        <span className="font-medium">{lesson.title}</span>
                        {lesson.is_completed && (
                          <Badge variant="outline" className="ml-auto">
                            Terminé
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-11 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Contenu du module à venir...
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/app/academy/${courseId}/${lesson.id}`)}
                        >
                          Accéder au module
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
};

export default CourseDetailPage;
