import Vapi from "@vapi-ai/web";

let vapiInstance: Vapi | null = null;

export function getVapi(): Vapi {
  if (!vapiInstance) {
    vapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!);
  }
  return vapiInstance;
}
