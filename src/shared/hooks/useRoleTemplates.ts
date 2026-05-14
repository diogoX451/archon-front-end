import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRoleTemplate,
  deleteRoleTemplate,
  listRoleTemplates,
  updateRoleTemplate,
  type CreateRoleTemplateInput,
  type UpdateRoleTemplateInput,
} from "@shared/api/role-templates";

const KEY = "role-templates";

export const useRoleTemplates = () =>
  useQuery({ queryKey: [KEY], queryFn: listRoleTemplates });

export const useCreateRoleTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleTemplateInput) => createRoleTemplate(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
};

export const useUpdateRoleTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRoleTemplateInput }) =>
      updateRoleTemplate(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
};

export const useDeleteRoleTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRoleTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
};
