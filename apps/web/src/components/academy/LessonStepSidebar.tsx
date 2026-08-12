import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useParams } from 'react-router-dom';

export interface Lesson {
  id: string;
  title: string;
  order_index: number;
  is_completed?: boolean;
}

interface LessonStepSidebarProps {
  lessons: Lesson[];
  currentLessonId?: string;
  courseId: string;
}

export const LessonStepSidebar: React.FC<LessonStepSidebarProps> = ({
  lessons,
  currentLessonId,
  courseId
}) => {
  const navigate = useNavigate();
  const sortedLessons = [...lessons].sort((a, b) => a.order_index - b.order_index);

  const handleLessonClick = (lessonId: string) => {
    navigate(`/app/academy/${courseId}/${lessonId}`);
  };

  return (
    <Card className="sticky top-8">
      <CardContent className="pt-6">
        <h3 className="font-semibold text-lg mb-4">Modules de la formation</h3>
        
        <div className="relative">
          {/* Progress line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200">
            {sortedLessons.length > 0 && (
              <div
                className="absolute top-0 left-0 w-full bg-[#009879] transition-all duration-500"
                style={{
                  height: `${(sortedLessons.filter(l => l.is_completed).length / sortedLessons.length) * 100}%`
                }}
              />
            )}
          </div>

          {/* Lesson steps */}
          <div className="relative space-y-6">
            {sortedLessons.map((lesson, index) => {
              const isCurrent = lesson.id === currentLessonId;
              const isCompleted = lesson.is_completed || false;
              const isUpcoming = !isCompleted && !isCurrent;

              return (
                <div
                  key={lesson.id}
                  className="flex items-start gap-4 cursor-pointer group"
                  onClick={() => handleLessonClick(lesson.id)}
                >
                  {/* Step circle */}
                  <div
                    className={cn(
                      "relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 flex-shrink-0",
                      isCompleted && "bg-[#009879] border-[#009879]",
                      isCurrent && !isCompleted && "border-[#009879] bg-white ring-2 ring-[#009879]",
                      isUpcoming && "border-gray-300 bg-white"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isCurrent ? "text-[#009879]" : "text-gray-400"
                        )}
                      >
                        {lesson.order_index}
                      </span>
                    )}
                  </div>

                  {/* Lesson title */}
                  <div className="flex-1 pt-1">
                    <p
                      className={cn(
                        "text-sm font-medium transition-colors group-hover:text-[#009879]",
                        isCurrent ? "text-[#009879]" : isCompleted ? "text-gray-900" : "text-gray-600"
                      )}
                    >
                      {lesson.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress summary */}
        {sortedLessons.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-semibold text-[#009879]">
                {sortedLessons.filter(l => l.is_completed).length} / {sortedLessons.length}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};




