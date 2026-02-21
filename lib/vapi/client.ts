import Vapi from "@vapi-ai/web";

let vapiInstance: Vapi | null = null;

export function getVapi(): Vapi {
  if (!vapiInstance) {
    vapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!);
  }
  return vapiInstance;
}

/** Destroy the current singleton so the next getVapi() call returns a fresh instance.
 *  Call this between interview phases to avoid "ejected" state errors. */
export function resetVapi(): void {
  if (vapiInstance) {
    try {
      vapiInstance.stop();
    } catch {
      // Already stopped — ignore
    }
    vapiInstance = null;
  }
}
