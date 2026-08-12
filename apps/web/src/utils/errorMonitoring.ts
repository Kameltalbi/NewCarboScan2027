// Error monitoring utility — production-grade tracking with structured reporting

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  extra?: Record<string, any>;
}

const ERROR_LOG_KEY = 'carboscan_error_log';
const MAX_ERRORS = 100;

const storeError = (report: ErrorReport) => {
  try {
    const stored = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]');
    stored.unshift(report);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(stored.slice(0, MAX_ERRORS)));
  } catch {}
};

export const captureException = (
  error: Error,
  extra?: Record<string, any>,
  severity: ErrorReport['severity'] = 'high'
) => {
  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    severity,
    extra,
  };

  storeError(report);

  if (import.meta.env.DEV) {
    console.error('[ErrorMonitor]', error, extra);
  }
};

export const captureMessage = (
  message: string,
  extra?: Record<string, any>,
  severity: ErrorReport['severity'] = 'medium'
) => {
  const report: ErrorReport = {
    message,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    severity,
    extra,
  };
  storeError(report);
};

export const getErrorLog = (): ErrorReport[] => {
  try {
    return JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]');
  } catch {
    return [];
  }
};

export const clearErrorLog = () => {
  localStorage.removeItem(ERROR_LOG_KEY);
};

export const getErrorStats = () => {
  const errors = getErrorLog();
  const now = Date.now();
  const last24h = errors.filter(e => now - new Date(e.timestamp).getTime() < 86400000);
  const bySeverity = last24h.reduce((acc, e) => {
    acc[e.severity] = (acc[e.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total: errors.length,
    last24h: last24h.length,
    bySeverity,
    topErrors: Object.entries(
      last24h.reduce((acc, e) => {
        acc[e.message] = (acc[e.message] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
};

// Global error handlers
export const initErrorMonitoring = () => {
  window.addEventListener('error', (event) => {
    captureException(
      event.error || new Error(event.message),
      { filename: event.filename, lineno: event.lineno, colno: event.colno },
      'high'
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    captureException(error, { type: 'unhandledrejection' }, 'critical');
  });

  // Performance monitoring — log slow page loads
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 3000) {
            captureMessage(`Slow resource: ${entry.name} (${Math.round(entry.duration)}ms)`, {
              entryType: entry.entryType,
              duration: entry.duration,
            }, 'low');
          }
        }
      });
      observer.observe({ entryTypes: ['resource'] });
    } catch {}
  }
};
