'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { Card, CardTitle } from '@/components/shared/Card';

interface WorkflowRow {
  id: string;
  name: string;
}
interface ProjectRow {
  id: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const { data: workflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => apiFetch<WorkflowRow[]>('/api/workflows'),
  });

  const [name, setName] = useState('');
  const [workflowId, setWorkflowId] = useState('');
  const [language, setLanguage] = useState('vi');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [targetDuration, setTargetDuration] = useState(60);
  const [script, setScript] = useState('');

  const effectiveWorkflowId = workflowId || workflows?.[0]?.id || '';

  const createProject = useMutation({
    mutationFn: () =>
      apiFetch<ProjectRow>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name,
          workflowId: effectiveWorkflowId,
          language,
          aspectRatio,
          targetDuration,
          script,
        }),
      }),
    onSuccess: (project) => router.push(`/projects/${project.id}`),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold mb-1">Create Video</h1>
      <p className="text-sm text-neutral-400 mb-6">Step 1 of the pipeline: project settings + script plan.</p>

      <Card className="mb-5">
        <CardTitle>Project Settings</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Project name">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer sneaker launch"
            />
          </Field>
          <Field label="Workflow">
            <select className="input" value={effectiveWorkflowId} onChange={(e) => setWorkflowId(e.target.value)}>
              {(workflows ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Language">
            <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Aspect ratio">
            <select className="input" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}>
              <option value="9:16">9:16 (vertical / Short)</option>
              <option value="16:9">16:9 (horizontal)</option>
              <option value="1:1">1:1 (square)</option>
            </select>
          </Field>
          <Field label="Target duration (seconds)">
            <input
              type="number"
              className="input"
              value={targetDuration}
              min={5}
              onChange={(e) => setTargetDuration(Number(e.target.value))}
            />
          </Field>
        </div>
      </Card>

      <Card className="mb-5">
        <CardTitle>Script Plan</CardTitle>
        <textarea
          className="input min-h-[160px] resize-y"
          placeholder="Paste or write the full script here..."
          value={script}
          onChange={(e) => setScript(e.target.value)}
        />
      </Card>

      {createProject.isError && (
        <div className="text-sm text-red-400 mb-4">{(createProject.error as Error).message}</div>
      )}

      <button
        className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg"
        disabled={!name || !script || !effectiveWorkflowId || createProject.isPending}
        onClick={() => createProject.mutate()}
      >
        {createProject.isPending ? 'Creating…' : 'Create Project →'}
      </button>

      <style jsx global>{`
        .input {
          width: 100%;
          background: rgb(23 23 23);
          border: 1px solid rgb(64 64 64);
          border-radius: 8px;
          color: rgb(245 245 245);
          font-size: 13px;
          padding: 8px 12px;
          outline: none;
        }
        .input:focus {
          border-color: rgb(167 139 250);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500 mb-1.5">{label}</div>
      {children}
    </label>
  );
}
