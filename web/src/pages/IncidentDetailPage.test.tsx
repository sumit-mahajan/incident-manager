import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../test/utils';
import { IncidentDetailPage } from './IncidentDetailPage';
import * as hooks from '../features/incidents/hooks';
import type { Incident } from '../types';

vi.mock('../features/incidents/hooks', async () => {
  const actual = await vi.importActual<typeof import('../features/incidents/hooks')>(
    '../features/incidents/hooks'
  );
  return {
    ...actual,
    useIncident: vi.fn(),
    useUsers: vi.fn(),
    useGroups: vi.fn(),
    useUserGroups: vi.fn(),
    useUpdateStatus: vi.fn(),
    useUpdateAssignee: vi.fn(),
    useGenerateSummary: vi.fn(),
    useGenerateRootCause: vi.fn(),
    useComments: vi.fn(),
    useAddComment: vi.fn(),
  };
});

const users = [{ userId: 'user-1', name: 'Alice', email: 'a@x.com', createdAt: '' }];
const groups = [{ groupId: 'group-1', name: 'DBA', description: '', createdAt: '' }];

function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    incidentId: 'inc-1',
    key: 'INC-1',
    title: 'Nightly DB refresh failed',
    description: 'Balances not visible',
    severity: 'Critical',
    status: 'Open',
    reporterId: 'user-1',
    assigneeId: null,
    targetGroupId: 'group-1',
    resolvedAt: null,
    aiSummary: null,
    aiSummaryGeneratedAt: null,
    aiRootCause: null,
    aiRootCauseGeneratedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderDetail(
  incident: Incident,
  activeUserId: string | null,
  overrides: {
    generateSummary?: object;
    generateRootCause?: object;
    comments?: object[];
    addComment?: object;
  } = {},
) {
  if (activeUserId) localStorage.setItem('incidenthub-user-id', activeUserId);

  vi.mocked(hooks.useIncident).mockReturnValue({ data: incident, isLoading: false, isError: false } as never);
  vi.mocked(hooks.useUsers).mockReturnValue({ data: users } as never);
  vi.mocked(hooks.useGroups).mockReturnValue({ data: groups } as never);
  vi.mocked(hooks.useUserGroups).mockReturnValue({
    data: activeUserId === 'user-1' ? groups : [],
  } as never);
  const updateStatus = { mutate: vi.fn(), isPending: false };
  const updateAssignee = { mutate: vi.fn(), isPending: false };
  const generateSummary = { mutate: vi.fn(), isPending: false, isError: false, ...overrides.generateSummary };
  const generateRootCause = { mutate: vi.fn(), isPending: false, isError: false, ...overrides.generateRootCause };
  const addComment = { mutate: vi.fn(), isPending: false, isError: false, ...overrides.addComment };
  vi.mocked(hooks.useUpdateStatus).mockReturnValue(updateStatus as never);
  vi.mocked(hooks.useUpdateAssignee).mockReturnValue(updateAssignee as never);
  vi.mocked(hooks.useGenerateSummary).mockReturnValue(generateSummary as never);
  vi.mocked(hooks.useGenerateRootCause).mockReturnValue(generateRootCause as never);
  vi.mocked(hooks.useComments).mockReturnValue({ data: overrides.comments ?? [] } as never);
  vi.mocked(hooks.useAddComment).mockReturnValue(addComment as never);

  renderWithProviders(
    <Routes>
      <Route path="/incidents/:id" element={<IncidentDetailPage />} />
    </Routes>,
    { route: '/incidents/inc-1' }
  );

  return { updateStatus, updateAssignee, generateSummary, generateRootCause, addComment };
}

describe('IncidentDetailPage RBAC-driven UI', () => {
  beforeEach(() => localStorage.clear());

  it('allows a target-group member to update status and shows the next transition', () => {
    renderDetail(makeIncident({ status: 'Open' }), 'user-1');
    expect(screen.getByRole('button', { name: 'Start Work' })).toBeInTheDocument();
  });

  it('blocks status updates for a user outside the target group and assignee', () => {
    renderDetail(makeIncident({ status: 'Open' }), 'user-2');
    expect(screen.queryByRole('button', { name: 'Start Work' })).not.toBeInTheDocument();
    expect(screen.getByText(/Only the assignee or group members can update status/i)).toBeInTheDocument();
  });

  it('blocks status updates when no active user is selected, even on an unassigned incident', () => {
    renderDetail(makeIncident({ status: 'Open', assigneeId: null }), null);
    expect(screen.queryByRole('button', { name: 'Start Work' })).not.toBeInTheDocument();
    expect(screen.getByText(/Only the assignee or group members can update status/i)).toBeInTheDocument();
  });

  it('calls updateStatus.mutate with the target status when a transition button is clicked', () => {
    const { updateStatus } = renderDetail(makeIncident({ status: 'Open', assigneeId: 'user-1' }), 'user-1');
    fireEvent.click(screen.getByRole('button', { name: 'Start Work' }));
    expect(updateStatus.mutate).toHaveBeenCalledWith('InProgress');
  });

  it('disables the Start Work button and shows a hint when the incident is unassigned', () => {
    renderDetail(makeIncident({ status: 'Open', assigneeId: null }), 'user-1');
    expect(screen.getByRole('button', { name: 'Start Work' })).toBeDisabled();
    expect(screen.getByText(/Self-assign before moving to In Progress/i)).toBeInTheDocument();
  });

  it('enables Start Work once the incident is assigned', () => {
    renderDetail(makeIncident({ status: 'Open', assigneeId: 'user-1' }), 'user-1');
    expect(screen.getByRole('button', { name: 'Start Work' })).not.toBeDisabled();
    expect(screen.queryByText(/Self-assign before moving to In Progress/i)).not.toBeInTheDocument();
  });

  it('disables Reopen for an unassigned Resolved incident', () => {
    renderDetail(makeIncident({ status: 'Resolved', assigneeId: null }), 'user-1');
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeDisabled();
  });

  it('shows a self-assign button for target-group members who are not yet the assignee', () => {
    renderDetail(makeIncident({ assigneeId: null }), 'user-1');
    expect(screen.getByRole('button', { name: 'Self-assign' })).toBeInTheDocument();
  });

  it('hides self-assign for non-members and shows a hint instead', () => {
    renderDetail(makeIncident({ assigneeId: null }), 'user-2');
    expect(screen.queryByRole('button', { name: 'Self-assign' })).not.toBeInTheDocument();
    expect(screen.getByText(/Only target group members can self-assign/i)).toBeInTheDocument();
  });

  it('shows no transition buttons for a Closed incident', () => {
    renderDetail(makeIncident({ status: 'Closed' }), 'user-1');
    expect(screen.queryByRole('button', { name: /Start Work|Resolve|Close|Reopen/ })).not.toBeInTheDocument();
  });
});

describe('IncidentDetailPage AI summary and root-cause', () => {
  beforeEach(() => localStorage.clear());

  it('shows a Generate Summary button and empty state when no summary exists yet', () => {
    renderDetail(makeIncident({ aiSummary: null }), 'user-1');
    expect(screen.getByRole('button', { name: /Generate Summary/i })).toBeInTheDocument();
    expect(screen.getByText(/No summary generated yet/i)).toBeInTheDocument();
  });

  it('shows the cached summary with its timestamp and a Regenerate button', () => {
    renderDetail(
      makeIncident({ aiSummary: 'Cached summary text.', aiSummaryGeneratedAt: '2026-01-01T00:00:00.000Z' }),
      'user-1',
    );
    expect(screen.getByText('Cached summary text.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Regenerate/i })).toBeInTheDocument();
  });

  it('calls generateSummary.mutate when the button is clicked', () => {
    const { generateSummary } = renderDetail(makeIncident({ aiSummary: null }), 'user-1');
    fireEvent.click(screen.getByRole('button', { name: /Generate Summary/i }));
    expect(generateSummary.mutate).toHaveBeenCalled();
  });

  it('shows an error message when summary generation fails, without breaking the page', () => {
    renderDetail(makeIncident({ aiSummary: null }), 'user-1', { generateSummary: { isError: true } });
    expect(screen.getByText(/Failed to generate summary/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Summary/i })).toBeInTheDocument();
  });

  it('shows a Suggest Root Causes button and empty state when none exist yet', () => {
    renderDetail(makeIncident({ aiRootCause: null }), 'user-1');
    expect(screen.getByRole('button', { name: /Suggest Root Causes/i })).toBeInTheDocument();
    expect(screen.getByText(/No root-cause hypotheses generated yet/i)).toBeInTheDocument();
  });

  it('shows cached root-cause hypotheses as an advisory list with a Regenerate button', () => {
    renderDetail(
      makeIncident({ aiRootCause: ['Cause A', 'Cause B'], aiRootCauseGeneratedAt: '2026-01-01T00:00:00.000Z' }),
      'user-1',
    );
    expect(screen.getByText('Cause A')).toBeInTheDocument();
    expect(screen.getByText('Cause B')).toBeInTheDocument();
    expect(screen.getByText(/Advisory hypotheses, not definitive findings/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Regenerate/i })).toBeInTheDocument();
  });

  it('calls generateRootCause.mutate when the button is clicked', () => {
    const { generateRootCause } = renderDetail(makeIncident({ aiRootCause: null }), 'user-1');
    fireEvent.click(screen.getByRole('button', { name: /Suggest Root Causes/i }));
    expect(generateRootCause.mutate).toHaveBeenCalled();
  });
});

describe('IncidentDetailPage comments', () => {
  beforeEach(() => localStorage.clear());

  it('shows an empty state and comment form for the reporter', () => {
    renderDetail(makeIncident(), 'user-1');
    expect(screen.getByText(/No comments yet/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Add a comment/i)).toBeInTheDocument();
  });

  it('lists existing comments with author and body', () => {
    renderDetail(makeIncident(), 'user-1', {
      comments: [
        { commentId: 'c1', incidentId: 'inc-1', authorId: 'user-1', body: 'Investigating now.', createdAt: '2026-01-01T00:00:00.000Z' },
      ],
    });
    const commentItem = screen.getByText('Investigating now.').closest('li');
    expect(commentItem).not.toBeNull();
    expect(commentItem!.textContent).toContain('Alice');
  });

  it('hides the comment form and shows a hint for a user with no relationship to the incident', () => {
    renderDetail(makeIncident(), 'user-2');
    expect(screen.queryByPlaceholderText(/Add a comment/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Only the reporter, assignee, or target group members can comment/i)).toBeInTheDocument();
  });

  it('hides the comment form when no active user is selected, even on an unassigned incident', () => {
    renderDetail(makeIncident({ assigneeId: null }), null);
    expect(screen.queryByPlaceholderText(/Add a comment/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Only the reporter, assignee, or target group members can comment/i)).toBeInTheDocument();
  });

  it('calls addComment.mutate with the typed body when Submit is clicked', () => {
    const { addComment } = renderDetail(makeIncident(), 'user-1');
    fireEvent.change(screen.getByPlaceholderText(/Add a comment/i), { target: { value: 'Working on it.' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));
    expect(addComment.mutate).toHaveBeenCalledWith('Working on it.', expect.anything());
  });

  it('disables Submit when the textarea is empty', () => {
    renderDetail(makeIncident(), 'user-1');
    expect(screen.getByRole('button', { name: /Submit/i })).toBeDisabled();
  });

  it('shows an error message when posting a comment fails', () => {
    renderDetail(makeIncident(), 'user-1', { addComment: { isError: true } });
    expect(screen.getByText(/Failed to post comment/i)).toBeInTheDocument();
  });
});
