// Section 6 — Calendrier de déploiement

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClimateAction, ClimateLever, ACTION_STATUS_LABELS, ACTION_STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';

interface CalendarSectionProps {
  actions: ClimateAction[];
  levers: ClimateLever[];
  baselineYear: number;
  targetYear: number;
}

export const CalendarSection: React.FC<CalendarSectionProps> = ({ actions, levers, baselineYear, targetYear }) => {
  const currentYear = new Date().getFullYear();
  const [viewYear, setViewYear] = useState(currentYear);
  const [groupBy, setGroupBy] = useState<'lever' | 'status' | 'priority'>('lever');

  const quarters = ['T1', 'T2', 'T3', 'T4'];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  // Filter actions that overlap with viewYear
  const yearActions = useMemo(() => {
    return actions.filter(a => {
      const start = a.start_date ? new Date(a.start_date) : null;
      const end = a.target_date ? new Date(a.target_date) : a.end_date ? new Date(a.end_date) : null;
      if (!start && !end) return false;
      const startYear = start ? start.getFullYear() : viewYear;
      const endYear = end ? end.getFullYear() : viewYear;
      return startYear <= viewYear && endYear >= viewYear;
    });
  }, [actions, viewYear]);

  // Group actions
  const grouped = useMemo(() => {
    const groups: Record<string, { label: string; actions: ClimateAction[] }> = {};
    yearActions.forEach(a => {
      let key: string, label: string;
      if (groupBy === 'lever') {
        key = a.lever_id;
        label = levers.find(l => l.id === a.lever_id)?.name || 'Sans levier';
      } else if (groupBy === 'status') {
        key = a.status;
        label = ACTION_STATUS_LABELS[a.status];
      } else {
        key = a.priority;
        label = PRIORITY_LABELS[a.priority];
      }
      if (!groups[key]) groups[key] = { label, actions: [] };
      groups[key].actions.push(a);
    });
    return Object.entries(groups);
  }, [yearActions, groupBy, levers]);

  // Calculate bar position (month 0-11)
  const getBarSpan = (action: ClimateAction) => {
    const start = action.start_date ? new Date(action.start_date) : null;
    const end = action.target_date ? new Date(action.target_date) : action.end_date ? new Date(action.end_date) : null;
    
    let startMonth = 0;
    let endMonth = 11;
    
    if (start) {
      if (start.getFullYear() < viewYear) startMonth = 0;
      else if (start.getFullYear() === viewYear) startMonth = start.getMonth();
      else return null;
    }
    if (end) {
      if (end.getFullYear() > viewYear) endMonth = 11;
      else if (end.getFullYear() === viewYear) endMonth = end.getMonth();
      else return null;
    }
    
    return { startMonth, endMonth, width: ((endMonth - startMonth + 1) / 12) * 100, left: (startMonth / 12) * 100 };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Calendrier de déploiement</h2>
          <p className="text-sm text-muted-foreground">{yearActions.length} actions planifiées en {viewYear}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lever">Par levier</SelectItem>
              <SelectItem value="status">Par statut</SelectItem>
              <SelectItem value="priority">Par priorité</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewYear(y => y - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-bold w-12 text-center">{viewYear}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewYear(y => y + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* Gantt-like view */}
      <Card>
        <CardContent className="pt-4 pb-2">
          {/* Month headers */}
          <div className="flex mb-1">
            <div className="w-[180px] shrink-0" />
            <div className="flex-1 flex">
              {months.map(m => (
                <div key={m} className="flex-1 text-center text-[10px] text-muted-foreground font-medium">{m}</div>
              ))}
            </div>
          </div>

          {/* Quarter separators */}
          <div className="flex mb-2">
            <div className="w-[180px] shrink-0" />
            <div className="flex-1 flex">
              {quarters.map((q, i) => (
                <div key={q} className={`flex-1 text-center text-[9px] text-muted-foreground border-l ${i === 0 ? '' : ''}`}>{q}</div>
              ))}
            </div>
          </div>

          {/* Groups */}
          {grouped.length === 0 ? (
            <div className="py-12 text-center">
              <CalIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucune action planifiée pour {viewYear}</p>
            </div>
          ) : grouped.map(([key, group]) => (
            <div key={key} className="mb-4">
              <div className="text-xs font-semibold text-foreground mb-1 pl-1">{group.label}</div>
              {group.actions.map(action => {
                const bar = getBarSpan(action);
                const isDelayed = action.target_date && new Date(action.target_date) < new Date() && action.status !== 'completed';
                return (
                  <div key={action.id} className="flex items-center mb-1">
                    <div className="w-[180px] shrink-0 pr-2">
                      <span className="text-[10px] truncate block">{action.title}</span>
                    </div>
                    <div className="flex-1 relative h-5 bg-muted/30 rounded-sm">
                      {bar && (
                        <div
                          className={`absolute top-0.5 h-4 rounded-sm text-[9px] flex items-center justify-center text-white font-medium ${isDelayed ? 'bg-red-500' : 'bg-primary'}`}
                          style={{ left: `${bar.left}%`, width: `${Math.max(bar.width, 3)}%` }}
                        >
                          {bar.width > 15 ? `${action.progress_percent}%` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Year summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-lg font-bold">{yearActions.length}</div>
            <div className="text-[10px] text-muted-foreground">Actions planifiées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-lg font-bold text-emerald-600">{yearActions.filter(a => a.status === 'completed').length}</div>
            <div className="text-[10px] text-muted-foreground">Terminées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-lg font-bold text-amber-600">{yearActions.filter(a => a.status === 'in_progress').length}</div>
            <div className="text-[10px] text-muted-foreground">En cours</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-lg font-bold text-red-600">
              {yearActions.filter(a => a.target_date && new Date(a.target_date) < new Date() && a.status !== 'completed').length}
            </div>
            <div className="text-[10px] text-muted-foreground">En retard</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
