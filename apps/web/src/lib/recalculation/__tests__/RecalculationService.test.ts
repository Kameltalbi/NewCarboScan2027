import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockInvoke, mockFrom, mockRpc, mockChannel } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockChannel: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
    from: mockFrom,
    rpc: mockRpc,
    channel: mockChannel,
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn() },
  default: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn() },
}));

import { RecalculationService } from '../RecalculationService';

describe('RecalculationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('triggerManualRecalculation', () => {
    it('calls edge function with correct payload', async () => {
      mockInvoke.mockResolvedValue({ data: { recalculations: { bilan_carbone: {} } }, error: null });

      const result = await RecalculationService.triggerManualRecalculation('org-1', { productId: 'p-1' });

      expect(mockInvoke).toHaveBeenCalledWith('recalculate-on-activity-change', {
        body: {
          type: 'MANUAL',
          table: 'activity_data',
          record: {
            organization_id: 'org-1',
            product_id: 'p-1',
            period_start: undefined,
            period_end: undefined,
          },
        },
      });
      expect(result).toEqual({ bilan_carbone: {} });
    });

    it('throws on edge function error', async () => {
      mockInvoke.mockResolvedValue({ data: null, error: { message: 'Failed' } });

      await expect(
        RecalculationService.triggerManualRecalculation('org-1')
      ).rejects.toThrow('Erreur lors du recalcul: Failed');
    });
  });

  describe('getRecalculationHistory', () => {
    it('fetches history ordered by date', async () => {
      const mockData = [{ id: '1', status: 'completed' }];
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
            }),
          }),
        }),
      });

      const result = await RecalculationService.getRecalculationHistory('org-1');
      expect(result).toEqual(mockData);
    });
  });

  describe('isRecalculationInProgress', () => {
    it('returns true when pending tasks exist', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
              }),
            }),
          }),
        }),
      });

      expect(await RecalculationService.isRecalculationInProgress('org-1')).toBe(true);
    });

    it('returns false when no pending tasks', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      });

      expect(await RecalculationService.isRecalculationInProgress('org-1')).toBe(false);
    });
  });

  describe('subscribeToRecalculations', () => {
    it('creates channel subscription', () => {
      const mockSubscribe = vi.fn().mockReturnValue('subscription');
      const mockOn = vi.fn().mockReturnValue({ subscribe: mockSubscribe });
      mockChannel.mockReturnValue({ on: mockOn });

      const callback = vi.fn();
      RecalculationService.subscribeToRecalculations('org-1', callback);

      expect(mockChannel).toHaveBeenCalledWith('recalculation_org-1');
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });
});
