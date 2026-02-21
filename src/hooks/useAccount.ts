import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Account = Tables<"accounts">;

export function useAccount() {
  return useQuery({
    queryKey: ["account"],
    queryFn: async (): Promise<Account | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) {
        // If no account found, return null instead of throwing
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
