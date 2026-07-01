import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { incidentService, userService, groupService, type IncidentFilters } from './services';
import { ApiError } from '../../lib/apiClient';

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
      const msg = err instanceof ApiError ? err.message : 'Failed to create incident';
      toast.error(msg);
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
      const msg = err instanceof ApiError ? err.message : 'Failed to update status';
      toast.error(msg);
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
      const msg = err instanceof ApiError ? err.message : 'Failed to update assignee';
      toast.error(msg);
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
