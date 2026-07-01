import type { CurrentUser, Incident, IncidentFilter, Pagination, Paginated, Severity, Status } from '../../domain/types';
import type { IncidentRepository, GroupRepository, LlmClient } from '../../domain/ports';
import { NotFoundError, ForbiddenError, ValidationError } from '../../domain/errors';
import { validateTransition } from '../../domain/statemachine';
import { canSelfAssign, canUpdateStatus, canEditFields } from '../../domain/permissions';
import type { CreateIncidentInput, UpdateIncidentFieldsInput } from './schemas';

export class IncidentService {
  constructor(
    private incidentRepo: IncidentRepository,
    private groupRepo: GroupRepository,
    private llmClient: LlmClient
  ) {}

  async create(currentUser: CurrentUser, input: CreateIncidentInput): Promise<Incident> {
    const group = await this.groupRepo.findById(input.targetGroupId);
    if (!group) throw new ValidationError('targetGroupId references a non-existent group');

    const key = await this.incidentRepo.nextKey();
    return this.incidentRepo.create({
      key,
      title: input.title,
      description: input.description,
      severity: input.severity as Severity,
      targetGroupId: input.targetGroupId,
      reporterId: currentUser.userId,
    });
  }

  async findById(id: string): Promise<Incident> {
    const incident = await this.incidentRepo.findById(id);
    if (!incident) throw new NotFoundError('Incident');
    return incident;
  }

  async findMany(filter: IncidentFilter, pagination: Pagination): Promise<Paginated<Incident>> {
    return this.incidentRepo.findMany(filter, pagination);
  }

  async updateFields(currentUser: CurrentUser, id: string, input: UpdateIncidentFieldsInput): Promise<Incident> {
    const incident = await this.incidentRepo.findById(id);
    if (!incident) throw new NotFoundError('Incident');

    const isMember = await this.groupRepo.isMember(currentUser.userId, incident.targetGroupId);
    if (!canEditFields(currentUser, incident, isMember)) throw new ForbiddenError();

    return this.incidentRepo.update(id, {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.severity !== undefined && { severity: input.severity as Severity }),
      updatedAt: new Date(),
    });
  }

  async updateStatus(currentUser: CurrentUser, id: string, newStatus: Status): Promise<Incident> {
    const incident = await this.incidentRepo.findById(id);
    if (!incident) throw new NotFoundError('Incident');

    const isMember = await this.groupRepo.isMember(currentUser.userId, incident.targetGroupId);
    if (!canUpdateStatus(currentUser, incident, isMember)) throw new ForbiddenError();

    validateTransition(incident.status, newStatus);

    return this.incidentRepo.update(id, {
      status: newStatus,
      ...(newStatus === 'Resolved' && !incident.resolvedAt ? { resolvedAt: new Date() } : {}),
      updatedAt: new Date(),
    });
  }

  async updateAssignee(currentUser: CurrentUser, id: string, assigneeId: string | null): Promise<Incident> {
    if (assigneeId !== null && assigneeId !== currentUser.userId) {
      throw new ForbiddenError('You can only assign yourself');
    }

    const incident = await this.incidentRepo.findById(id);
    if (!incident) throw new NotFoundError('Incident');

    const isMember = await this.groupRepo.isMember(currentUser.userId, incident.targetGroupId);
    if (!canSelfAssign(currentUser, incident, isMember)) throw new ForbiddenError('Only target group members can self-assign');

    return this.incidentRepo.update(id, {
      assigneeId,
      updatedAt: new Date(),
    });
  }

  async suggestSeverityAndRouting(
    description: string
  ): Promise<{ severity: Severity; targetGroupId: string; targetGroupName: string }> {
    const groups = await this.groupRepo.findAll();
    const suggestion = await this.llmClient.suggestSeverityAndRouting(description, groups);
    const group = groups.find((g) => g.groupId === suggestion.targetGroupId)!;
    return { ...suggestion, targetGroupName: group.name };
  }

  async generateSummary(id: string): Promise<{ aiSummary: string; aiSummaryGeneratedAt: Date }> {
    const incident = await this.incidentRepo.findById(id);
    if (!incident) throw new NotFoundError('Incident');

    const group = await this.groupRepo.findById(incident.targetGroupId);
    const aiSummary = await this.llmClient.summarize(incident, group?.name ?? 'Unknown group');
    const aiSummaryGeneratedAt = new Date();

    await this.incidentRepo.updateAiCache(id, { aiSummary, aiSummaryGeneratedAt, updatedAt: new Date() });
    return { aiSummary, aiSummaryGeneratedAt };
  }

  async generateRootCause(id: string): Promise<{ aiRootCause: string[]; aiRootCauseGeneratedAt: Date }> {
    const incident = await this.incidentRepo.findById(id);
    if (!incident) throw new NotFoundError('Incident');

    const group = await this.groupRepo.findById(incident.targetGroupId);
    const aiRootCause = await this.llmClient.suggestRootCause(incident, group?.name ?? 'Unknown group');
    const aiRootCauseGeneratedAt = new Date();

    await this.incidentRepo.updateAiCache(id, { aiRootCause, aiRootCauseGeneratedAt, updatedAt: new Date() });
    return { aiRootCause, aiRootCauseGeneratedAt };
  }

  async parseIntake(
    text: string
  ): Promise<{ title: string; description: string; severity: Severity; targetGroupId: string; targetGroupName: string }> {
    const groups = await this.groupRepo.findAll();
    const parsed = await this.llmClient.parseIntake(text, groups);
    const group = groups.find((g) => g.groupId === parsed.targetGroupId)!;
    return { ...parsed, targetGroupName: group.name };
  }
}
