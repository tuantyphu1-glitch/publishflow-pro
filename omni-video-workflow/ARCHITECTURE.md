# Architecture

## Philosophy

One reusable workflow engine, built once, on top of which multiple content
workflows are configured (not coded), talking to interchangeable AI providers
through fixed interfaces. The workflow engine, API routes, and React components
never import a vendor SDK directly — they only depend on `LLMProvider`,
`ImageProvider`, `VideoProvider`, `TTSProvider`, and `StorageProvider`.

```
                    OMNI VIDEO WORKFLOW
                            │
                     Workflow Engine
                            │
        ┌───────────────────┼───────────────────┬───────────────┐
        │                   │                   │               │
       LLM              IMAGE ENGINE       VIDEO ENGINE      TTS ENGINE
        │                   │                   │               │
  ┌─────┼─────┐       ┌─────┼─────┐       ┌─────┼─────┐   ┌─────┼─────┐
  Gemini  Mock        Imagen  Mock         Veo3   Mock      EdgeTTS Mock
                            │
                            ▼
                     ASSET MANAGER (StorageProvider)
                            │
                            ▼
                     TIMELINE ENGINE (deterministic)
                            │
                            ▼
                     FFmpeg RENDER WORKER
                            │
                            ▼
                        FINAL VIDEO
```

## Tech stack

Next.js 14 (App Router, TypeScript strict), Tailwind CSS, Zustand + React Query,
PostgreSQL + Prisma, BullMQ + Redis (job queue, wired up starting Phase 2), FFmpeg
via `fluent-ffmpeg`, Zod at every trust boundary.

## Repository layout

```
prisma/schema.prisma        Project, Scene, Character, Product, Asset,
                             GenerationJob, ProviderConfig, Workflow, Render,
                             UsageRecord
prisma/seed.ts               seeds workflows/ configs + default mock ProviderConfig
src/app/                     Next.js pages + API routes
src/components/              React components (shared UI, layout, per-feature)
src/lib/
  db.ts, logger.ts           core singletons
  validation/                env.ts (Zod-validated env), schemas.ts (all Zod schemas)
  workflow/
    registry.ts               ONLY place that resolves ProviderConfig -> a provider
                               instance; implements fallback + usage recording
    scriptAnalysis.ts          LLM call -> Zod validate -> repair-retry -> throw
  storage/                    StorageProvider interface + local filesystem impl
src/providers/
  llm/ image/ video/ tts/     types.ts (interface), mockProvider.ts (real, working,
                               tagged provider:'mock'), <vendor>Provider.ts (real
                               adapter, stubbed until Phase 7), index.ts (factory)
src/types/                   shared domain types (re-exported Prisma types + WorkflowConfig)
workflows/                   one config file per content workflow + index.ts registry
```

## Provider abstraction

```ts
interface LLMProvider   { generateText(input): Promise<LLMResponse> }
interface ImageProvider { generateImage(input): Promise<ImageGenerationResponse> }
interface VideoProvider { generateVideo(input, onProgress?): Promise<VideoGenerationResponse> }
interface TTSProvider   { generateSpeech(input): Promise<TTSResponse> }
interface StorageProvider { upload, download, delete, getUrl }
```

Providers return raw bytes (`Buffer`), not URLs — persisting to storage is the
engine's job, not the provider's, so a provider never needs storage credentials.

`src/lib/workflow/registry.ts` is the only file (besides the concrete provider
modules themselves) allowed to construct a provider. It reads the active
`ProviderConfig` row per capability from Postgres and returns the matching
instance via each capability's `index.ts` factory. Adding a new provider means:
implement the interface in a new file, add one `case` to that factory, insert a
`ProviderConfig` row — zero changes to the engine, API routes, or UI.

## Mock providers (Phase 1)

Every capability ships a **real, working** mock — not a stub that returns fake
success:

- **Mock LLM**: deterministically splits the input script into 3–5 scenes by
  sentence count, returning schema-valid `ScriptAnalysisOutput` every time.
- **Mock Image**: renders an actual PNG (via `sharp`) — a solid color derived
  from a hash of the prompt, with the prompt text overlaid — so scenes stay
  visually distinguishable.
- **Mock Video**: uses real `ffmpeg` to loop the scene image for the requested
  duration with a Ken Burns zoom, producing a genuine, playable MP4 clip.
- **Mock TTS**: renders a real soft sine-tone MP3 via `ffmpeg`, duration
  estimated from word count (150 wpm).

Every mock-generated `Asset.provider` is `'mock'`; the UI (Assets page, sidebar
footer) surfaces this so mock and real output are never visually ambiguous.
Real adapters (`geminiProvider.ts` is implemented; `imagenProvider.ts`,
`veoProvider.ts`, `edgeTtsProvider.ts` are stubs) throw a clear, actionable
configuration error rather than silently pretending to succeed — see
`PROVIDERS.md`.

## Data model

See `prisma/schema.prisma`. Key relationships: a `Project` has many `Scene`s; a
`Scene` optionally links one `Asset` each for image/video/audio; `Character` and
`Product` rows carry their own reference `Asset`s and join a `Project` via
`ProjectCharacter`/`ProjectProduct`; every provider call is expected to write a
`GenerationJob` (job queue integration lands in Phase 2+) and a `UsageRecord`
(already wired via `registry.ts`'s `withFallback`/`recordUsage`).

## Phase plan

1. **Foundation** (done) — project structure, DB, provider interfaces + mocks,
   registry, workflow config registry + seed, app shell, project CRUD.
2. **Script → Storyboard** — `SCRIPT_ANALYSIS` job, storyboard UI, scene edit.
3. **Image pipeline** — prompt composition (character + product + scene +
   workflow style), `IMAGE_GENERATION` + `IMAGE_VALIDATION` jobs, reference
   image upload.
4. **Video pipeline** — `VIDEO_GENERATION` job from approved images.
5. **Voice** — `TTS` job per scene.
6. **Rendering** — deterministic `Timeline`, `subtitles.ts`, `ffmpegCommandBuilder`,
   `RENDER` job, final preview/export.
7. **Quality, retry, fallback, usage** — retry/backoff on every job, provider
   fallback wiring, usage dashboard.

Real providers (Gemini beyond script analysis, Imagen/FLUX, Veo, Edge-TTS) are
wired in only after the mock-only pipeline passes end-to-end through Phase 7 —
this is a hard rule, not a suggestion, so that the engine is proven correct
before it depends on paid/rate-limited external services.
