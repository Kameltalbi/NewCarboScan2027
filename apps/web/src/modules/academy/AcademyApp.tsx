import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ModuleLayout } from "../shared/ModuleLayout";
import { Loader2 } from "lucide-react";

// Lazy load pages
const AcademyCatalogPage = React.lazy(() => import('@/pages/academy/AcademyCatalogPage').then(m => ({ default: m.default })));
const CourseDetailPage = React.lazy(() => import('@/pages/academy/CourseDetailPage').then(m => ({ default: m.default })));
const LessonPage = React.lazy(() => import('@/pages/academy/LessonPage').then(m => ({ default: m.default })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const AcademyApp: React.FC = () => {
  return (
    <ModuleLayout moduleSlug="academy">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route index element={<AcademyCatalogPage />} />
          <Route path=":courseId" element={<CourseDetailPage />} />
          <Route path=":courseId/:lessonId" element={<LessonPage />} />
          <Route path="*" element={<Navigate to="/app/academy" replace />} />
        </Routes>
      </Suspense>
    </ModuleLayout>
  );
};

export default AcademyApp;

