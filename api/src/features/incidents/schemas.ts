import { z } from 'zod';

export const CreateIncidentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
  targetGroupId: z.string().uuid('targetGroupId must be a valid UUID'),
});

export const UpdateIncidentFieldsSchema = z
  .object({
    title: z.string().min(5).max(200).optional(),
    description: z.string().min(10).optional(),
    severity: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'At least one field is required',
  });

export const UpdateStatusSchema = z.object({
  status: z.enum(['Open', 'InProgress', 'Resolved', 'Closed']),
});

export const UpdateAssigneeSchema = z.object({
  assigneeId: z.string().uuid().nullable(),
});

export const ListIncidentsQuerySchema = z.object({
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  status: z.enum(['Open', 'InProgress', 'Resolved', 'Closed']).optional(),
  group: z.string().uuid().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateIncidentInput = z.infer<typeof CreateIncidentSchema>;
export type UpdateIncidentFieldsInput = z.infer<typeof UpdateIncidentFieldsSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type UpdateAssigneeInput = z.infer<typeof UpdateAssigneeSchema>;
export type ListIncidentsQuery = z.infer<typeof ListIncidentsQuerySchema>;
