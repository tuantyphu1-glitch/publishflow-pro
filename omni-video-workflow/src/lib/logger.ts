/**
 * Structured logger. Every call is a single JSON line so log aggregators can parse it.
 * Field names follow the observability spec: requestId, projectId, jobId, provider,
 * operation, duration, status, error. Never log API keys — redactKeys() strips any
 * field whose name looks secret-shaped before it reaches stdout.
 */

type LogFields = Record<string, unknown>;

const SECRET_KEY_PATTERN = /(key|token|secret|password|authorization)/i;

function redact(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = SECRET_KEY_PATTERN.test(k) ? '[redacted]' : v;
  }
  return out;
}

function emit(level: 'info' | 'warn' | 'error', message: string, fields: LogFields = {}) {
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...redact(fields),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, fields?: LogFields) => emit('info', message, fields),
  warn: (message: string, fields?: LogFields) => emit('warn', message, fields),
  error: (message: string, fields?: LogFields) => emit('error', message, fields),
};
