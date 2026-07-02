export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type Status = 'Open' | 'InProgress' | 'Resolved' | 'Closed';

export interface CurrentUser {
  userId: string;
  name: string;
  email: string;
}

export interface User {
  userId: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface Group {
  groupId: string;
  name: string;
  description: string;
  createdAt: Date;
}

export interface UserWithGroups extends User {
  groups: Group[];
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
  resolvedAt: Date | null;
  aiSummary: string | null;
  aiSummaryGeneratedAt: Date | null;
  aiRootCause: string[] | null;
  aiRootCauseGeneratedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncidentComment {
  commentId: string;
  incidentId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

export interface NewIncident {
  title: string;
  description: string;
  severity: Severity;
  targetGroupId: string;
  reporterId: string;
  key: string;
}

export interface UpdateableIncidentFields {
  title?: string;
  description?: string;
  severity?: Severity;
  status?: Status;
  assigneeId?: string | null;
  resolvedAt?: Date | null;
  updatedAt: Date;
}

export interface AiCachePatch {
  aiSummary?: string;
  aiSummaryGeneratedAt?: Date;
  aiRootCause?: string[];
  aiRootCauseGeneratedAt?: Date;
  updatedAt: Date;
}

export interface IncidentFilter {
  severity?: Severity;
  status?: Status;
  groupId?: string;
  q?: string;
}

export interface Pagination {
  page: number;
  limit: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface NewComment {
  incidentId: string;
  authorId: string;
  body: string;
}
