import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ModuleLayout } from '@/modules/shared/ModuleLayout';
import { Button } from '@/components/ui/button';
import { LessonContent, LessonResource } from '@/components/academy/LessonContent';
import { LessonStepSidebar, Lesson as LessonType } from '@/components/academy/LessonStepSidebar';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from "@/integrations/api/client";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  order_index: number;
}

const LessonPage: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<LessonType[]>([]);
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courseId && lessonId) {
      fetchLessonData();
    }
  }, [courseId, lessonId]);

  const fetchLessonData = async () => {
    if (!courseId || !lessonId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch current lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (lessonError) throw lessonError;
      setLesson(lessonData);

      // Fetch all lessons for the sidebar
      const { data: allLessonsData, error: allLessonsError } = await supabase
        .from('lessons')
        .select('id, title, order_index')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (allLessonsError) throw allLessonsError;

      // Fetch user progress
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('lesson_id, is_completed')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('is_completed', true);

        const completedLessonIds = new Set(progressData?.map(p => p.lesson_id) || []);
        const currentLessonCompleted = completedLessonIds.has(lessonId);

        setIsCompleted(currentLessonCompleted);

        setAllLessons(
          (allLessonsData || []).map(l => ({
            ...l,
            is_completed: completedLessonIds.has(l.id)
          }))
        );
      } else {
        setAllLessons(allLessonsData || []);
      }

      // Fetch resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('lesson_resources')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });

      if (resourcesError) throw resourcesError;
      setResources((resourcesData || []).map(r => ({
        ...r,
        type: r.type as LessonResource['type']
      })));

      // Fetch quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('id')
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (quizError) throw quizError;
      setQuizId(quizData?.id || null);
    } catch (err: any) {
      console.error('Error fetching lesson data:', err);
      setError(err.message || 'Erreur lors du chargement du module');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!courseId || !lessonId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Erreur',
          description: 'Vous devez être connecté pour marquer un module comme terminé',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          course_id: courseId,
          lesson_id: lessonId,
          is_completed: true,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,lesson_id'
        });

      if (error) throw error;

      setIsCompleted(true);
      toast({
        title: 'Module terminé',
        description: 'Ce module a été marqué comme terminé',
      });

      // Refresh lessons to update progress
      fetchLessonData();
    } catch (err: any) {
      console.error('Error marking lesson as complete:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer le module comme terminé',
        variant: 'destructive'
      });
    }
  };

  const getNextLesson = () => {
    const currentIndex = allLessons.findIndex(l => l.id === lessonId);
    if (currentIndex < allLessons.length - 1) {
      return allLessons[currentIndex + 1];
    }
    return null;
  };

  const getPreviousLesson = () => {
    const currentIndex = allLessons.findIndex(l => l.id === lessonId);
    if (currentIndex > 0) {
      return allLessons[currentIndex - 1];
    }
    return null;
  };

  const handleNext = () => {
    const next = getNextLesson();
    if (next) {
      navigate(`/app/academy/${courseId}/${next.id}`);
    }
  };

  const handlePrevious = () => {
    const previous = getPreviousLesson();
    if (previous) {
      navigate(`/app/academy/${courseId}/${previous.id}`);
    } else {
      navigate(`/app/academy/${courseId}`);
    }
  };

  if (loading) {
    return (
      <ModuleLayout moduleSlug="academy">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#009879] mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement du module...</p>
          </div>
        </div>
      </ModuleLayout>
    );
  }

  if (error || !lesson) {
    return (
      <ModuleLayout moduleSlug="academy">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || 'Module non trouvé'}</p>
            <Button onClick={() => navigate(`/app/academy/${courseId}`)} variant="outline">
              Retour à la formation
            </Button>
          </div>
        </div>
      </ModuleLayout>
    );
  }

  const nextLesson = getNextLesson();
  const previousLesson = getPreviousLesson();

  return (
    <ModuleLayout moduleSlug="academy">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar with lesson steps */}
        <div className="lg:col-span-1">
          <LessonStepSidebar
            lessons={allLessons}
            currentLessonId={lessonId}
            courseId={courseId!}
          />
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handlePrevious}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {previousLesson ? 'Module précédent' : 'Retour à la formation'}
            </Button>

            <div className="flex items-center gap-2">
              {isCompleted && (
                <div className="flex items-center gap-2 text-[#009879]">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Terminé</span>
                </div>
              )}
              {!isCompleted && (
                <Button
                  onClick={handleMarkComplete}
                  variant="outline"
                  className="border-[#009879] text-[#009879] hover:bg-[#009879] hover:text-white"
                >
                  Marquer comme terminé
                </Button>
              )}
              {nextLesson && (
                <Button
                  onClick={handleNext}
                  className="bg-[#009879] hover:bg-[#007a63]"
                >
                  Module suivant
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Lesson Content */}
          <LessonContent
            lessonTitle={lesson.title}
            content={lesson.content}
            resources={resources}
            quizId={quizId}
          />
        </div>
      </div>
    </ModuleLayout>
  );
};

export default LessonPage;




