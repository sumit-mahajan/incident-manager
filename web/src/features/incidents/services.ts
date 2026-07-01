import { api } from '../../lib/apiClient';
import type { Incident, Paginated, Group, User, IncidentSuggestion, IncidentDraft, IncidentComment } from '../../types';

export interface IncidentFilters {
  severity?: string;
  status?: string;
  group?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export const incidentService = {
  list: (filters: IncidentFilters) => {
    const params = new URLSearchParams();
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.status) params.set('status', filters.status);
    if (filters.group) params.set('group', filters.group);
    if (filters.q) params.set('q', filters.q);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    const qs = params.toString();
    return api.get<Paginated<Incident>>(`/incidents${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) => api.get<Incident>(`/incidents/${id}`),

  create: (body: { title: string; description: string; severity: string; targetGroupId: string }) =>
    api.post<Incident>('/incidents', body),

  updateFields: (id: string, body: { title?: string; description?: string; severity?: string }) =>
    api.patch<Incident>(`/incidents/${id}`, body),

  updateStatus: (id: string, status: string) =>
    api.patch<Incident>(`/incidents/${id}/status`, { status }),

  updateAssignee: (id: string, assigneeId: string | null) =>
    api.patch<Incident>(`/incidents/${id}/assignee`, { assigneeId }),

  suggest: (description: string) =>
    api.post<IncidentSuggestion>('/incidents/suggest', { description }),

  generateSummary: (id: string) =>
    api.post<{ aiSummary: string; aiSummaryGeneratedAt: string }>(`/incidents/${id}/summary`, {}),

  generateRootCause: (id: string) =>
    api.post<{ aiRootCause: string[]; aiRootCauseGeneratedAt: string }>(`/incidents/${id}/root-cause`, {}),

  intake: (text: string) =>
    api.post<{ parsed: IncidentDraft }>('/incidents/intake', { text }),

  listComments: (id: string) => api.get<IncidentComment[]>(`/incidents/${id}/comments`),

  addComment: (id: string, body: string) => api.post<IncidentComment>(`/incidents/${id}/comments`, { body }),
};

export const userService = {
  list: () => api.get<User[]>('/users'),
  getGroups: (userId: string) => api.get<Group[]>(`/users/${userId}/groups`),
};

export const groupService = {
  list: () => api.get<Group[]>('/groups'),
};
