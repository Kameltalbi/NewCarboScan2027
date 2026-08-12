/**
 * Setup global pour les tests Vitest.
 * Mock localStorage et le client Supabase pour éviter les erreurs
 * dans les modules qui importent le client Supabase au top-level.
 */
import { vi } from 'vitest';

// Mock localStorage (absent en Node.js)
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
(globalThis as any).localStorage = localStorageMock;
