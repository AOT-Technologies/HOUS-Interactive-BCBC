import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppendixStore } from './appendix-store';

describe('appendix-store', () => {
  beforeEach(() => {
    useAppendixStore.getState().clearCache();
    vi.restoreAllMocks();
  });

  it('caches appendix data and avoids duplicate fetches', async () => {
    const appendixPayload = {
      id: 'nbc.divB.part5.appendix',
      type: 'part_appendix' as const,
      introduction: 'Appendix',
      application_notes: [],
    };

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({
        ok: true,
        json: async () => appendixPayload,
      } as Response);

    const { fetchAppendix } = useAppendixStore.getState();

    const first = await fetchAppendix('2027', 'nbc.divB', '5');
    const second = await fetchAppendix('2027', 'nbc.divB', '5');

    expect(first).toEqual(appendixPayload);
    expect(second).toEqual(appendixPayload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent appendix requests for the same key', async () => {
    const appendixPayload = {
      id: 'nbc.divB.part5.appendix',
      type: 'part_appendix' as const,
      introduction: 'Appendix',
      application_notes: [],
    };

    let resolveFetch: ((value: Response) => void) | null = null;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(fetchPromise);
    const { fetchAppendix } = useAppendixStore.getState();

    const reqA = fetchAppendix('2027', 'nbc.divB', '5');
    const reqB = fetchAppendix('2027', 'nbc.divB', '5');

    resolveFetch?.({
      ok: true,
      json: async () => appendixPayload,
    } as Response);

    const [resultA, resultB] = await Promise.all([reqA, reqB]);

    expect(resultA).toEqual(appendixPayload);
    expect(resultB).toEqual(appendixPayload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
