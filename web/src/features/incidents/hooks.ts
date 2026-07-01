import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { incidentService, userService, groupService, type IncidentFilters } from './services';
import { ApiError } from '../../lib/apiClient';

export function errorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  if (err.code === 'AI_UNAVAILABLE') return 'AI service is temporarily unavailable. Please try again shortly.';
  if (err.code === 'PARSE_FAILED') return 'AI returned an unexpected response. Please try again.';
  return err.message;
}

export function useIncidents(filters: IncidentFilters) {
  return useQuery({
    queryKey: ['incidents', filters],
    queryFn: () => incidentService.list(filters),
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: ['incident', id],
    queryFn: () => incidentService.getById(id),
    enabled: !!id,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: incidentService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'Failed to create incident'));
    },
  });
}

export function useUpdateStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: string) => incidentService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident', id] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'Failed to update status'));
    },
  });
}

export function useUpdateAssignee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assigneeId: string | null) => incidentService.updateAssignee(id, assigneeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident', id] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'Failed to update assignee'));
    },
  });
}

export function useSuggestIncident() {
  return useMutation({
    mutationFn: incidentService.suggest,
  });
}

export function useIntakeIncident() {
  return useMutation({
    mutationFn: incidentService.intake,
  });
}

export function useGenerateSummary(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => incidentService.generateSummary(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident', id] });
    },
  });
}

export function useGenerateRootCause(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => incidentService.generateRootCause(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident', id] });
    },
  });
}

export function useComments(incidentId: string) {
  return useQuery({
    queryKey: ['comments', incidentId],
    queryFn: () => incidentService.listComments(incidentId),
    enabled: !!incidentId,
  });
}

export function useAddComment(incidentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => incidentService.addComment(incidentId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', incidentId] });
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'Failed to post comment'));
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: userService.list,
  });
}

export function useUserGroups(userId: string | null) {
  return useQuery({
    queryKey: ['user-groups', userId],
    queryFn: () => userService.getGroups(userId!),
    enabled: !!userId,
  });
}

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: groupService.list,
  });
}
