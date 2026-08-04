"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  aiGetConversation,
  aiHideConversation,
  aiListConversations,
  aiRenameConversation,
  aiStartConversation,
} from "@/actions/ai/conversations";

export function useAiConversations(opts: { page?: number; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["ai", "conversations", opts.page ?? 1],
    queryFn: async () => {
      const result = await aiListConversations({ page: opts.page });
      if (!result.ok) throw new Error(result.code);
      return result.data;
    },
    enabled: opts.enabled !== false,
  });
}

export function useAiConversation(opts: {
  conversationId: string | null | undefined;
  page?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["ai", "conversation", opts.conversationId, opts.page ?? 1],
    queryFn: async () => {
      if (!opts.conversationId) throw new Error("NOT_FOUND");
      const result = await aiGetConversation({
        conversationId: opts.conversationId,
        page: opts.page,
      });
      if (!result.ok) throw new Error(result.code);
      return result.data;
    },
    enabled: opts.enabled !== false && Boolean(opts.conversationId),
  });
}

export function useAiConversationMutations() {
  const queryClient = useQueryClient();

  const start = useMutation({
    mutationFn: async (input: { feature?: "PATIENT_ASSISTANT"; locale: "en" | "ar" }) => {
      const result = await aiStartConversation({
        feature: input.feature ?? "PATIENT_ASSISTANT",
        locale: input.locale,
      });
      if (!result.ok) throw new Error(result.code);
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
    },
  });

  const rename = useMutation({
    mutationFn: async (input: { conversationId: string; title: string }) => {
      const result = await aiRenameConversation(input);
      if (!result.ok) throw new Error(result.code);
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
    },
  });

  const hide = useMutation({
    mutationFn: async (input: { conversationId: string }) => {
      const result = await aiHideConversation(input);
      if (!result.ok) throw new Error(result.code);
      return result.data;
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
      void queryClient.removeQueries({ queryKey: ["ai", "conversation", vars.conversationId] });
    },
  });

  return { start, rename, hide };
}
