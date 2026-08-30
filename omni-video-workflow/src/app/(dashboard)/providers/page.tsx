'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { Card, CardTitle } from '@/components/shared/Card';

interface ProviderConfigRow {
  capability: 'LLM' | 'IMAGE' | 'VIDEO' | 'TTS';
  providerId: string;
  isPrimary: boolean;
  isFallback: boolean;
}

const OPTIONS: Record<ProviderConfigRow['capability'], { id: string; label: string; needsKey: string | null }[]> = {
  LLM: [
    { id: 'mock', label: 'Mock (deterministic, no key)', needsKey: null },
    { id: 'gemini', label: 'Google Gemini', needsKey: 'LLM_API_KEY' },
  ],
  IMAGE: [
    { id: 'mock', label: 'Mock (placeholder PNG, no key)', needsKey: null },
    { id: 'imagen', label: 'Google Imagen 3 / FLUX.1', needsKey: 'IMAGE_API_KEY' },
  ],
  VIDEO: [
    { id: 'mock', label: 'Mock (ffmpeg Ken Burns clip, no key)', needsKey: null },
    { id: 'veo', label: 'Google Veo 3', needsKey: 'VIDEO_API_KEY' },
  ],
  TTS: [
    { id: 'mock', label: 'Mock (sine-tone audio, no key)', needsKey: null },
    { id: 'edge-tts', label: 'Edge-TTS', needsKey: null },
  ],
};

export default function ProvidersPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['provider-configs'],
    queryFn: () => apiFetch<ProviderConfigRow[]>('/api/provider-configs'),
  });

  const setPrimary = useMutation({
    mutationFn: (params: { capability: string; providerId: string }) =>
      apiFetch('/api/provider-configs', { method: 'PUT', body: JSON.stringify({ ...params, isPrimary: true }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-configs'] }),
  });

  const isPrimary = (capability: string, providerId: string) =>
    !!data?.find((c) => c.capability === capability && c.providerId === providerId)?.isPrimary;

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold mb-1">Providers</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Select the active provider per capability. Real providers require the matching key in <code>.env</code> and
        will throw a clear configuration error until wired up (see PROVIDERS.md) — never a fake success.
      </p>
      <div className="space-y-4">
        {(Object.keys(OPTIONS) as (keyof typeof OPTIONS)[]).map((capability) => (
          <Card key={capability}>
            <CardTitle>{capability}</CardTitle>
            <div className="space-y-2">
              {OPTIONS[capability].map((opt) => (
                <label key={opt.id} className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={capability}
                    checked={isPrimary(capability, opt.id)}
                    onChange={() => setPrimary.mutate({ capability, providerId: opt.id })}
                  />
                  <span className="text-neutral-200">{opt.label}</span>
                  {opt.needsKey && <span className="text-[11px] text-neutral-500">requires {opt.needsKey}</span>}
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
