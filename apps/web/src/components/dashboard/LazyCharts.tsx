// Composants de graphiques chargés à la demande avec IntersectionObserver
// Les graphiques ne se chargent que lorsqu'ils sont visibles

import React, { useRef, useState, useEffect, Suspense, lazy } from 'react';
import { ChartSkeleton, PieChartSkeleton } from './skeletons/DashboardSkeleton';
import type { ScopeStatus } from './multi-tenant';

// Lazy load des composants de graphiques
const ScopeDistributionChart = lazy(() => 
  import('./multi-tenant/ScopeDistributionChart').then(m => ({ default: m.ScopeDistributionChart }))
);
const SiteDistributionChart = lazy(() => 
  import('./multi-tenant/SiteDistributionChart').then(m => ({ default: m.SiteDistributionChart }))
);
const EmissionPostsChart = lazy(() => 
  import('./multi-tenant/EmissionPostsChart').then(m => ({ default: m.EmissionPostsChart }))
);
const Scope3BreakdownChart = lazy(() => 
  import('./multi-tenant/Scope3BreakdownChart').then(m => ({ default: m.Scope3BreakdownChart }))
);
const Scope1BreakdownChart = lazy(() => 
  import('./multi-tenant/Scope1BreakdownChart').then(m => ({ default: m.Scope1BreakdownChart }))
);
const Scope2BreakdownChart = lazy(() => 
  import('./multi-tenant/Scope2BreakdownChart').then(m => ({ default: m.Scope2BreakdownChart }))
);
const Scope3Block = lazy(() => 
  import('./multi-tenant/Scope3Block').then(m => ({ default: m.Scope3Block }))
);
const EmissionsTimelineChart = lazy(() => 
  import('./multi-tenant/EmissionsTimelineChart').then(m => ({ default: m.EmissionsTimelineChart }))
);
const TrajectoryDecarbonationChart = lazy(() => 
  import('./multi-tenant/TrajectoryDecarbonationChart').then(m => ({ default: m.TrajectoryDecarbonationChart }))
);
const EmissionsSummaryTable = lazy(() => 
  import('./multi-tenant/EmissionsSummaryTable').then(m => ({ default: m.EmissionsSummaryTable }))
);
const DataQualityRadarChart = lazy(() => 
  import('./multi-tenant/DataQualityRadarChart').then(m => ({ default: m.DataQualityRadarChart }))
);

// Hook pour détecter la visibilité
const useIntersectionObserver = (options?: IntersectionObserverInit) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        setHasBeenVisible(true);
      } else {
        setIsVisible(false);
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px', // Précharger 100px avant d'être visible
      ...options,
    });

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [options]);

  return { ref, isVisible, hasBeenVisible };
};

// Wrapper générique pour chargement lazy
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  minHeight?: string;
}

const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback,
  minHeight = '300px' 
}) => {
  const { ref, hasBeenVisible } = useIntersectionObserver();

  return (
    <div ref={ref} style={{ minHeight }}>
      {hasBeenVisible ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
};

// Exports des composants lazy
interface LazyScopeDistributionChartProps {
  scope1: number;
  scope2: number;
  scope3: number;
  scopeStatuses: { scope1: ScopeStatus; scope2: ScopeStatus; scope3: ScopeStatus };
}

export const LazyScopeDistributionChart: React.FC<LazyScopeDistributionChartProps> = (props) => (
  <LazyWrapper fallback={<PieChartSkeleton />}>
    <ScopeDistributionChart {...props} />
  </LazyWrapper>
);

interface LazySiteDistributionChartProps {
  sites: Array<{ siteName: string; scope1: number; scope2: number }>;
}

export const LazySiteDistributionChart: React.FC<LazySiteDistributionChartProps> = (props) => (
  <LazyWrapper fallback={<ChartSkeleton />}>
    <SiteDistributionChart {...props} />
  </LazyWrapper>
);

interface LazyEmissionPostsChartProps {
  data: Array<{ name: string; emissions: number; scope: 1 | 2 | 3; percentage: number }>;
}

export const LazyEmissionPostsChart: React.FC<LazyEmissionPostsChartProps> = (props) => (
  <LazyWrapper fallback={<ChartSkeleton />}>
    <EmissionPostsChart {...props} />
  </LazyWrapper>
);

interface LazyScope3BreakdownChartProps {
  data: Array<{ name: string; emissions: number; scope: 1 | 2 | 3; percentage: number }>;
}

export const LazyScope3BreakdownChart: React.FC<LazyScope3BreakdownChartProps> = (props) => (
  <LazyWrapper fallback={<PieChartSkeleton />}>
    <Scope3BreakdownChart {...props} />
  </LazyWrapper>
);

interface LazyScope1BreakdownChartProps {
  data: Array<{ name: string; emissions: number; scope: 1 | 2 | 3; percentage: number }>;
}

export const LazyScope1BreakdownChart: React.FC<LazyScope1BreakdownChartProps> = (props) => (
  <LazyWrapper fallback={<PieChartSkeleton />}>
    <Scope1BreakdownChart {...props} />
  </LazyWrapper>
);

interface LazyScope2BreakdownChartProps {
  data: Array<{ name: string; emissions: number; scope: 1 | 2 | 3; percentage: number }>;
}

export const LazyScope2BreakdownChart: React.FC<LazyScope2BreakdownChartProps> = (props) => (
  <LazyWrapper fallback={<PieChartSkeleton />}>
    <Scope2BreakdownChart {...props} />
  </LazyWrapper>
);

interface LazyScope3BlockProps {
  coveragePercentage: number;
  methodology: 'hybrid' | 'screening' | 'specific';
  status: 'consolidated' | 'provisional';
  categories: any[];
  totalEmissions: number;
}

export const LazyScope3Block: React.FC<LazyScope3BlockProps> = (props) => (
  <LazyWrapper fallback={<ChartSkeleton title="Scope 3" />} minHeight="400px">
    <Scope3Block {...props} />
  </LazyWrapper>
);

interface LazyEmissionsTimelineChartProps {
  data?: Array<{ period: string; scope1: number; scope2: number; scope3: number; total: number }>;
  currentScope1?: number;
  currentScope2?: number;
  currentScope3?: number;
}

export const LazyEmissionsTimelineChart: React.FC<LazyEmissionsTimelineChartProps> = (props) => (
  <LazyWrapper fallback={<ChartSkeleton />}>
    <EmissionsTimelineChart {...props} />
  </LazyWrapper>
);

interface LazyEmissionsSummaryTableProps {
  data: any[];
  totalEmissions: number;
}

export const LazyEmissionsSummaryTable: React.FC<LazyEmissionsSummaryTableProps> = (props) => (
  <LazyWrapper fallback={<ChartSkeleton title="Synthèse" />} minHeight="300px">
    <EmissionsSummaryTable {...props} />
  </LazyWrapper>
);

interface LazyTrajectoryDecarbonationChartProps {
  currentEmissions: number;
  years?: number;
}

export const LazyTrajectoryDecarbonationChart: React.FC<LazyTrajectoryDecarbonationChartProps> = (props) => (
  <LazyWrapper fallback={<ChartSkeleton />} minHeight="400px">
    <TrajectoryDecarbonationChart {...props} />
  </LazyWrapper>
);

interface LazyDataQualityRadarChartProps {
  dataQuality: {
    real: number;
    estimated: number;
    default: number;
  };
}

export const LazyDataQualityRadarChart: React.FC<LazyDataQualityRadarChartProps> = (props) => (
  <LazyWrapper fallback={<ChartSkeleton />}>
    <DataQualityRadarChart {...props} />
  </LazyWrapper>
);

export { LazyWrapper, useIntersectionObserver };
