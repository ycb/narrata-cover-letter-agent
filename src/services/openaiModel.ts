function readEnv(key: string): string | undefined {
  const fromImportMeta = (import.meta as any)?.env?.[key] as string | undefined;
  const fromProcess = typeof process !== 'undefined' ? ((process as any)?.env?.[key] as string | undefined) : undefined;
  return fromImportMeta ?? fromProcess;
}

export function getDefaultOpenAIModelId(): string {
  return (readEnv('VITE_OPENAI_MODEL') || 'gpt-4o-mini').trim();
}

/**
 * HIL generation model override.
 *
 * - Default: `VITE_OPENAI_MODEL`
 * - Override: `VITE_OPENAI_MODEL_HIL`
 */
export function getHilGenerationModelId(): string {
  return (readEnv('VITE_OPENAI_MODEL_HIL') || readEnv('VITE_OPENAI_MODEL') || 'gpt-4o-mini').trim();
}

