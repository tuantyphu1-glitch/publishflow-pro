# Providers

Every AI capability (LLM, image, video, TTS) plus storage sits behind an
interface in `src/providers/<capability>/types.ts`. The engine never imports a
vendor SDK directly — only `src/lib/workflow/registry.ts` and the concrete
provider modules do.

## Adding a new provider

1. Implement the interface in a new file, e.g. `src/providers/image/fluxProvider.ts`:
   ```ts
   export class FluxProvider implements ImageProvider {
     readonly id = 'flux';
     constructor(private apiKey: string) { /* throw if missing */ }
     async generateImage(input: ImageGenerationRequest): Promise<ImageGenerationResponse> {
       // call the vendor API, return { imageBuffer, contentType, provider: this.id, model, raw }
     }
   }
   ```
2. Register it in that capability's factory, `src/providers/image/index.ts`:
   ```ts
   case 'flux': return new FluxProvider(getEnv().IMAGE_API_KEY);
   ```
3. Add a `ProviderConfig` row (via the Providers settings page, or directly)
   with `capability: 'IMAGE', providerId: 'flux', isPrimary: true`.

No changes to the workflow engine, API routes, or storyboard UI are required.

## Current providers

| Capability | id | Status | Notes |
|---|---|---|---|
| LLM | `mock` | ✅ working | deterministic sentence-split scene generator |
| LLM | `gemini` | ✅ implemented | `@google/generative-ai`, model `gemini-1.5-flash`, requires `LLM_API_KEY` |
| Image | `mock` | ✅ working | `sharp`-rendered placeholder PNG |
| Image | `imagen` | 🚧 stub | throws a config error; implement the Imagen/FLUX `predict()` call, requires `IMAGE_API_KEY` |
| Video | `mock` | ✅ working | real `ffmpeg` Ken Burns clip from the scene image |
| Video | `veo` | 🚧 stub | throws a config error; implement Veo's `predictLongRunning` + poll cycle, requires `VIDEO_API_KEY` |
| TTS | `mock` | ✅ working | real `ffmpeg` sine-tone MP3, duration from word count |
| TTS | `edge-tts` | 🚧 stub | throws a config error; implement the Edge read-aloud WebSocket protocol (free, no key) |

A 🚧 stub is intentional, not an oversight: per the hard rule "never fake
successful generation," an unconfigured/unimplemented provider must fail loudly
with an actionable message, never silently return placeholder data labeled as
real. Real providers beyond `gemini` are wired in only once the mock-only
pipeline (Phases 1–7) passes end-to-end.

## Fallback

`src/lib/workflow/registry.ts` exposes `getXFallbackProvider()` alongside
`getXProvider()` for every capability, resolved from the `ProviderConfig` row
with `isFallback: true`. `withFallback(request, primary, fallback, usageMeta)`
runs the primary, and on any thrown error falls back once, logging a
`provider_fallback` warning and recording a `UsageRecord` for both attempts.

## Usage tracking

Every call routed through `withFallback` writes a `UsageRecord` row — success or
failure, cost 0 or not — visible on the Settings page. Never omit a usage record
just because a provider is free.

## Secrets

API keys live only in `.env` / `.env.local` and are read exclusively inside
`src/providers/*` constructors via `getEnv()`. No provider call happens from a
client component; every generation goes through a server-side API route or job
worker.
