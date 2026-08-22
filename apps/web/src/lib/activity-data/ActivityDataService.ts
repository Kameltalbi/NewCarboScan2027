import { api } from "@/integrations/api/client";
import { ActivityData, ActivityDataInput, ActivityDataFilters, DataQualityStats } from './types';

export class ActivityDataService {
  static async create(data: ActivityDataInput): Promise<ActivityData> {
    const { item } = await api.createActivityData({
      ...data,
      data_quality: data.data_quality || 'estimated',
    } as unknown as Record<string, unknown>);
    return item as unknown as ActivityData;
  }

  static async getById(id: string): Promise<ActivityData | null> {
    try {
      const { item } = await api.getActivityData(id);
      return item as unknown as ActivityData;
    } catch {
      return null;
    }
  }

  static async list(filters: ActivityDataFilters): Promise<ActivityData[]> {
    const { items } = await api.listActivityData({
      siteId: filters.site_id,
      category: filters.category,
      activityType: filters.activity_type,
      periodStart: filters.period_start,
      periodEnd: filters.period_end,
      scopeHint: filters.scope_hint,
    });
    let rows = (items || []) as unknown as ActivityData[];
    if (filters.product_id) {
      rows = rows.filter((r) => (r as any).product_id === filters.product_id);
    }
    if (filters.data_quality) {
      rows = rows.filter((r) => r.data_quality === filters.data_quality);
    }
    return rows;
  }

  static async update(id: string, updates: Partial<ActivityDataInput>): Promise<ActivityData> {
    const { item } = await api.patchActivityData(id, updates as Record<string, unknown>);
    return item as unknown as ActivityData;
  }

  static async delete(id: string): Promise<void> {
    await api.deleteActivityData(id);
  }

  static async calculateEmissions(_activityId: string): Promise<number> {
    return 0;
  }

  static async getDataQualityStats(
    _organizationId: string,
    _periodStart?: string,
    _periodEnd?: string
  ): Promise<DataQualityStats> {
    const { stats } = await api.getActivityQualityStats();
    return stats as unknown as DataQualityStats;
  }

  static async bulkCreate(activities: ActivityDataInput[]): Promise<ActivityData[]> {
    const { items } = await api.createActivityData(
      activities.map((a) => ({
        ...a,
        data_quality: a.data_quality || 'estimated',
      })) as unknown as Record<string, unknown>[],
    );
    return (items || []) as unknown as ActivityData[];
  }
}
