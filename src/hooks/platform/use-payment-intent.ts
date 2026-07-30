"use client";

import { useMutation } from "@tanstack/react-query";

export type PaymentIntentResult = {
  providerIntentId: string;
  clientSecret?: string;
  redirectUrl?: string;
  idempotencyKey: string;
};

export function usePaymentIntent(config: {
  createIntent: (obligationId: string) => Promise<
    | { ok: true; data: PaymentIntentResult }
    | { ok: false; code: string; message?: string }
    | PaymentIntentResult
  >;
}) {
  const mutation = useMutation({
    mutationFn: async (obligationId: string) => {
      const result = await config.createIntent(obligationId);
      if (result && typeof result === "object" && "ok" in result) {
        if (!result.ok) throw new Error(result.code);
        return result.data;
      }
      return result as PaymentIntentResult;
    },
  });

  return {
    createIntent: mutation.mutateAsync,
    intent: mutation.data,
    isCreating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
