import type {
  User,
  Group,
  Incident,
  IncidentComment,
  NewIncident,
  NewComment,
  IncidentFilter,
  Pagination,
  Paginated,
  UpdateableIncidentFields,
  AiCachePatch,
} from './types';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  findGroupsByUserId(userId: string): Promise<Group[]>;
}

export interface GroupRepository {
  findAll(): Promise<Group[]>;
  findById(id: string): Promise<Group | null>;
  isMember(userId: string, groupId: string): Promise<boolean>;
}

export interface IncidentRepository {
  nextKey(): Promise<string>;
  create(input: NewIncident): Promise<Incident>;
  findById(id: string): Promise<Incident | null>;
  findMany(filter: IncidentFilter, pagination: Pagination): Promise<Paginated<Incident>>;
  update(id: string, patch: UpdateableIncidentFields): Promise<Incident>;
  updateAiCache(id: string, patch: AiCachePatch): Promise<void>;
}

export interface CommentRepository {
  create(input: NewComment): Promise<IncidentComment>;
  findByIncidentId(incidentId: string): Promise<IncidentComment[]>;
}
