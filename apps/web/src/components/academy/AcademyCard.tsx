import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface Course {
  id: string;
  title: string;
  description: string | null;
  duration: string | null;
  level: string | null;
  lessons_count?: number; // Number of lessons/modules
}

interface AcademyCardProps {
  course: Course;
}

export const AcademyCard: React.FC<AcademyCardProps> = ({ course }) => {
  const navigate = useNavigate();

  const handleViewCourse = () => {
    navigate(`/app/academy/${course.id}`);
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <CardTitle className="text-xl">{course.title}</CardTitle>
          {course.level && (
            <Badge variant="secondary" className="ml-2">
              {course.level}
            </Badge>
          )}
        </div>
        <CardDescription className="line-clamp-3">
          {course.description || 'Description à venir...'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {course.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{course.duration}</span>
            </div>
          )}
          {course.lessons_count !== undefined && (
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{course.lessons_count} module{course.lessons_count > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          onClick={handleViewCourse}
          className="w-full bg-[#009879] hover:bg-[#007a63]"
        >
          Voir la formation
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
};




