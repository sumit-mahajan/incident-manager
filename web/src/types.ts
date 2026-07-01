export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type Status = 'Open' | 'InProgress' | 'Resolved' | 'Closed';

export interface User {
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Group {
  groupId: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Incident {
  incidentId: string;
  key: string;
  title: string;
  description: string;
  severity: Severity;
  status: Status;
  reporterId: string;
  assigneeId: string | null;
  targetGroupId: string;
  resolvedAt: string | null;
  aiSummary: string | null;
  aiSummaryGeneratedAt: string | null;
  aiRootCause: string[] | null;
  aiRootCauseGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface IncidentSuggestion {
  severity: Severity;
  targetGroupId: string;
  targetGroupName: string;
}

export interface IncidentDraft {
  title: string;
  description: string;
  severity: Severity;
  targetGroupId: string;
  targetGroupName: string;
}

export interface IncidentComment {
  commentId: string;
  incidentId: string;
  authorId: string;
  body: string;
  createdAt: string;
}
