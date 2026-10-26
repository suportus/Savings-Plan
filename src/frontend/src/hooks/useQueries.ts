import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { toast } from "sonner";
import type {
  Currency,
  EmergencyFund,
  SavingGoal,
  SavingGoalDTO,
  ThemePreference,
  UserProfile,
  Variant_frontend_backend,
} from "../backend";
import { isAccessDenied } from "../lib/canisterEnv";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// Helper to extract user-friendly error messages from backend traps
function parseBackendError(error: Error): string {
  const message = error.message;
  const lowerMessage = message.toLowerCase();

  // Check for authorization errors (case-insensitive)
  if (lowerMessage.includes("unauthorized")) {
    // Extract the specific message after "Unauthorized: " or "unauthorized: "
    const match = message.match(/[Uu]nauthorized:\s*(.+?)(?:\n|$)/);
    if (match) {
      return match[1];
    }
    return "You do not have permission to perform this action";
  }

  // Check for not found errors (case-insensitive)
  if (lowerMessage.includes("not found")) {
    return "The requested item was not found or you do not have access to it";
  }

  // Check for access denied patterns
  if (
    lowerMessage.includes("access denied") ||
    lowerMessage.includes("do not have access")
  ) {
    return "You do not have access to this resource";
  }

  // Check for permission errors
  if (
    lowerMessage.includes("permission") ||
    lowerMessage.includes("forbidden")
  ) {
    return "You do not have permission to perform this action";
  }

  // Return the original message if no pattern matches
  return message;
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const { setTheme } = useTheme();

  // Scope query key by principal to prevent cross-user data leakage
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile", principalId],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      try {
        return await actor.getCallerUserProfile();
      } catch (error: any) {
        // If unauthorized, return null (user needs to set up profile)
        if (error.message?.toLowerCase().includes("unauthorized")) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: false,
  });

  // Sync theme from backend profile
  useEffect(() => {
    if (query.data?.themePreference) {
      const backendTheme =
        query.data.themePreference === "dark" ? "dark" : "light";
      setTheme(backendTheme);
    }
  }, [query.data?.themePreference, setTheme]);

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["currentUserProfile", principalId],
      });
      toast.success("Profile saved successfully");
    },
    onError: (error: Error) => {
      const friendlyMessage = parseBackendError(error);
      toast.error(`Failed to save profile: ${friendlyMessage}`);
    },
  });
}

export function useUpdateThemePreference() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useMutation({
    mutationFn: async (theme: ThemePreference) => {
      if (!actor) throw new Error("Actor not available");

      // Get current profile
      const currentProfile = await actor.getCallerUserProfile();
      if (!currentProfile) throw new Error("Profile not found");

      // Update with new theme
      return actor.saveCallerUserProfile({
        ...currentProfile,
        themePreference: theme,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["currentUserProfile", principalId],
      });
    },
    onError: (error: Error) => {
      console.error("Failed to update theme preference:", error);
    },
  });
}

export function useUpdateUserCurrency() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useMutation({
    mutationFn: async (currency: Currency) => {
      if (!actor) throw new Error("Actor not available");

      // Get current profile
      const currentProfile = await actor.getCallerUserProfile();
      if (!currentProfile) throw new Error("Profile not found");

      // Update with new currency
      return actor.saveCallerUserProfile({
        ...currentProfile,
        defaultCurrency: currency,
      });
    },
    onSuccess: () => {
      // Invalidate all queries that might display currency
      queryClient.invalidateQueries({
        queryKey: ["currentUserProfile", principalId],
      });
      queryClient.invalidateQueries({ queryKey: ["savingGoals", principalId] });
      queryClient.invalidateQueries({
        queryKey: ["emergencyFund", principalId],
      });
      toast.success("Currency updated successfully");
    },
    onError: (error: Error) => {
      const friendlyMessage = parseBackendError(error);
      toast.error(`Failed to update currency: ${friendlyMessage}`);
    },
  });
}

export function useUpdateUserName() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not available");

      // Get current profile
      const currentProfile = await actor.getCallerUserProfile();
      if (!currentProfile) throw new Error("Profile not found");

      // Update with new name
      return actor.saveCallerUserProfile({
        ...currentProfile,
        name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["currentUserProfile", principalId],
      });
      toast.success("Name updated successfully");
    },
    onError: (error: Error) => {
      const friendlyMessage = parseBackendError(error);
      toast.error(`Failed to update name: ${friendlyMessage}`);
    },
  });
}

export function useGetAllSavingGoals() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useQuery<SavingGoal[]>({
    queryKey: ["savingGoals", principalId],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllSavingGoals();
      } catch (error: any) {
        // Not on the allow-list: the access-denied screen explains it.
        if (isAccessDenied(error)) return [];
        const friendlyMessage = parseBackendError(error);
        toast.error(`Failed to load goals: ${friendlyMessage}`);
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useCreateSavingGoal() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useMutation({
    mutationFn: async (data: SavingGoalDTO) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createSavingGoal(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savingGoals", principalId] });
      queryClient.invalidateQueries({ queryKey: ["statistics", principalId] });
      toast.success("Saving goal created successfully");
    },
    onError: (error: Error) => {
      const friendlyMessage = parseBackendError(error);
      toast.error(`Failed to create goal: ${friendlyMessage}`);
    },
  });
}

export function useUpdateSavingGoal() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SavingGoalDTO }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateSavingGoal(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savingGoals", principalId] });
      queryClient.invalidateQueries({ queryKey: ["statistics", principalId] });
      toast.success("Saving goal updated successfully");
    },
    onError: (error: Error) => {
      const friendlyMessage = parseBackendError(error);
      toast.error(`Failed to update goal: ${friendlyMessage}`);
    },
  });
}

export function useDeleteSavingGoal() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteSavingGoal(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savingGoals", principalId] });
      queryClient.invalidateQueries({ queryKey: ["statistics", principalId] });
      toast.success("Saving goal deleted successfully");
    },
    onError: (error: Error) => {
      const friendlyMessage = parseBackendError(error);
      toast.error(`Failed to delete goal: ${friendlyMessage}`);
    },
  });
}

export function useAddToCurrentSavedAmount() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addToCurrentSavedAmount(id, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savingGoals", principalId] });
      queryClient.invalidateQueries({ queryKey: ["statistics", principalId] });
      toast.success("Amount added successfully");
    },
    onError: (error: Error) => {
      const friendlyMessage = parseBackendError(error);
      toast.error(`Failed to add amount: ${friendlyMessage}`);
    },
  });
}

// Emergency Fund Hooks

export function useGetEmergencyFund() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useQuery<EmergencyFund>({
    queryKey: ["emergencyFund", principalId],
    queryFn: async () => {
      if (!actor) return { bankAmount: 0, cashAmount: 0 };
      try {
        return await actor.getEmergencyFund();
      } catch (error: any) {
        const friendlyMessage = parseBackendError(error);
        toast.error(`Failed to load emergency fund: ${friendlyMessage}`);
        return { bankAmount: 0, cashAmount: 0 };
      }
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useUpdateEmergencyFund() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useMutation({
    mutationFn: async ({ bank, cash }: { bank: number; cash: number }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateEmergencyFund(bank, cash);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["emergencyFund", principalId],
      });
      toast.success("Emergency fund updated");
    },
    onError: (error: Error) => {
      const friendlyMessage = parseBackendError(error);
      toast.error(`Failed to update emergency fund: ${friendlyMessage}`);
    },
  });
}

// Statistics Hooks

export function useGetStatistics() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useQuery<{
    totalGoalsCreated: bigint;
    completedGoals: bigint;
    totalSavedAmount: number;
    biggestAchievement: number;
  } | null>({
    queryKey: ["statistics", principalId],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getStatistics();
      } catch (error: any) {
        // Statistics may not exist yet, return null silently
        if (error.message?.toLowerCase().includes("unauthorized")) {
          return null;
        }
        console.error("Failed to load statistics:", error);
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useResetStatistics() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.resetStatistics();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statistics", principalId] });
    },
    onError: (error: Error) => {
      const friendlyMessage = parseBackendError(error);
      toast.error(`Failed to reset statistics: ${friendlyMessage}`);
    },
  });
}

// Cycles Hooks

export function useGetCycleBalance(enabled: boolean) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useQuery<bigint>({
    queryKey: ["cycleBalance", principalId],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCycleBalance();
    },
    enabled: enabled && !!actor && !isFetching && !!identity,
  });
}

// Update call (reads the frontend's status), so it is cached for 5 minutes.
export function useGetFrontendCycleBalance(enabled: boolean) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useQuery<bigint | null>({
    queryKey: ["frontendCycleBalance", principalId],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getFrontendCycleBalance();
    },
    enabled: enabled && !!actor && !isFetching && !!identity,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGetWalletCycles(enabled: boolean) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toString() || "anonymous";

  return useQuery<bigint>({
    queryKey: ["walletCycles", principalId],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getWalletCycles();
    },
    enabled: enabled && !!actor && !isFetching && !!identity,
  });
}

export function useClaimCycles() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (target: Variant_frontend_backend) => {
      if (!actor) throw new Error("Actor not available");
      return actor.claimCycles(target);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walletCycles"] });
      queryClient.invalidateQueries({ queryKey: ["cycleBalance"] });
      queryClient.invalidateQueries({ queryKey: ["frontendCycleBalance"] });
    },
  });
}
