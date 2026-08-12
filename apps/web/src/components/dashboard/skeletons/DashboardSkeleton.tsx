// Skeleton professionnel pour le dashboard - affichage instantané
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const DashboardHeaderSkeleton: React.FC = () => (
  <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-0">
    <CardContent className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const KPICardSkeleton: React.FC = () => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

export const KPIGridSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <KPICardSkeleton />
    <KPICardSkeleton />
    <KPICardSkeleton />
    <KPICardSkeleton />
  </div>
);

export const ChartSkeleton: React.FC<{ title?: string }> = ({ title }) => (
  <Card>
    <CardHeader className="pb-2">
      {title ? (
        <Skeleton className="h-5 w-40" />
      ) : (
        <Skeleton className="h-5 w-40" />
      )}
    </CardHeader>
    <CardContent>
      <div className="h-[250px] flex items-center justify-center">
        <div className="w-full h-full flex items-end justify-around gap-2 px-4">
          {/* Bar chart skeleton */}
          <Skeleton className="w-1/6 h-[40%] rounded-t" />
          <Skeleton className="w-1/6 h-[70%] rounded-t" />
          <Skeleton className="w-1/6 h-[55%] rounded-t" />
          <Skeleton className="w-1/6 h-[85%] rounded-t" />
          <Skeleton className="w-1/6 h-[65%] rounded-t" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const PieChartSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-48" />
    </CardHeader>
    <CardContent>
      <div className="h-[250px] flex items-center justify-center">
        <div className="relative">
          <Skeleton className="h-40 w-40 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="h-20 w-20 rounded-full bg-background" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-48" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex gap-4 pb-2 border-b">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const StatsCardsSkeleton: React.FC = () => (
  <Card>
    <CardContent className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center space-y-2">
            <Skeleton className="h-8 w-16 mx-auto" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Full Dashboard Skeleton - Layout complet instantané
export const FullDashboardSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#F8F8F8] dark:bg-slate-950/50">
    <div className="space-y-5 sm:space-y-6 p-4 sm:p-6 max-w-7xl mx-auto min-w-0">
      {/* Header skeleton */}
      <DashboardHeaderSkeleton />
      
      {/* Stats cards skeleton */}
      <StatsCardsSkeleton />
      
      {/* KPI Grid skeleton */}
      <KPIGridSkeleton />
      
      {/* Charts grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartSkeleton />
        <ChartSkeleton />
      </div>
      
      {/* Table skeleton */}
      <TableSkeleton rows={5} />
    </div>
  </div>
);

export default FullDashboardSkeleton;
