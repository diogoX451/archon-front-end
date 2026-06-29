import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listRiskClassifications,
  reviewRiskClassification,
  type RiskListFilter,
  type RiskListResponse,
} from "@shared/api/risk";

export const riskKeys = {
  all: ["risk"] as const,
  list: (filter: RiskListFilter) => [...riskKeys.all, "list", filter] as const,
};

export const useRiskList = (
  filter: RiskListFilter,
  options?: { enabled?: boolean; refetchInterval?: number | false }
) =>
  useQuery<RiskListResponse>({
    queryKey: riskKeys.list(filter),
    queryFn: () => listRiskClassifications(filter),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });

export const useReviewRisk = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewRiskClassification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: riskKeys.all });
    },
  });
};
