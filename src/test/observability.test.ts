import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUsageSummary, getUsageBreakdown } from '../shared/api/observability';

vi.mock('../shared/api/client', () => ({
  fetchClient: vi.fn(),
}));

import { fetchClient } from '../shared/api/client';
const mockFetch = fetchClient as ReturnType<typeof vi.fn>;

beforeEach(() => { mockFetch.mockReset(); });

describe('observability API', () => {
  it('getUsageSummary calls correct endpoint', () => {
    mockFetch.mockResolvedValue({ calls: 0, input_tokens: 0, output_tokens: 0, cached_tokens: 0, cost_usd: 0, avg_latency_ms: 0 });
    getUsageSummary();
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/usage/summary');
  });

  it('getUsageSummary passes from/to params', () => {
    mockFetch.mockResolvedValue({});
    getUsageSummary({ from: '2024-01-01', to: '2024-01-31' });
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/usage/summary?from=2024-01-01&to=2024-01-31');
  });

  it('getUsageBreakdown passes dimension param', () => {
    mockFetch.mockResolvedValue([]);
    getUsageBreakdown({ dimension: 'purpose' });
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/usage/breakdown?dimension=purpose');
  });
});
