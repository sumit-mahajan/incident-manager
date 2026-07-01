import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';
import { CreateIncidentPage } from './CreateIncidentPage';
import * as hooks from '../features/incidents/hooks';

vi.mock('../features/incidents/hooks', async () => {
  const actual = await vi.importActual<typeof import('../features/incidents/hooks')>(
    '../features/incidents/hooks'
  );
  return {
    ...actual,
    useGroups: vi.fn(),
    useCreateIncident: vi.fn(),
    useSuggestIncident: vi.fn(),
    useIntakeIncident: vi.fn(),
  };
});

const groups = [
  { groupId: 'group-1', name: 'DBA', description: 'Owns database ops', createdAt: '2026-01-01' },
];

describe('CreateIncidentPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(hooks.useGroups).mockReturnValue({ data: groups } as never);
    vi.mocked(hooks.useCreateIncident).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ incidentId: 'inc-1', key: 'INC-1' }),
      isPending: false,
    } as never);
    vi.mocked(hooks.useSuggestIncident).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ severity: 'High', targetGroupId: 'group-1', targetGroupName: 'DBA' }),
      isPending: false,
      isError: false,
    } as never);
    vi.mocked(hooks.useIntakeIncident).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        parsed: {
          title: 'DB refresh failed overnight',
          description: 'The nightly refresh job failed, balances are stale',
          severity: 'High',
          targetGroupId: 'group-1',
          targetGroupName: 'DBA',
        },
      }),
      isPending: false,
      isError: false,
    } as never);
  });

  it('warns and blocks submission when no acting user is selected', () => {
    renderWithProviders(<CreateIncidentPage />);
    expect(screen.getByText(/Select an acting user/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Incident/i })).toBeDisabled();
  });

  it('shows validation errors for a too-short title and description', async () => {
    localStorage.setItem('incidenthub-user-id', 'user-1');
    renderWithProviders(<CreateIncidentPage />);

    fireEvent.change(screen.getByPlaceholderText(/Brief summary/i), { target: { value: 'Hi' } });
    fireEvent.change(screen.getByPlaceholderText(/Detailed description/i), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Incident/i }));

    expect(await screen.findByText('Title must be at least 5 characters')).toBeInTheDocument();
    expect(screen.getByText('Description must be at least 10 characters')).toBeInTheDocument();
  });

  it('submits and navigates to the new incident when the form is valid', async () => {
    localStorage.setItem('incidenthub-user-id', 'user-1');
    const create = vi.mocked(hooks.useCreateIncident)();
    renderWithProviders(<CreateIncidentPage />);

    fireEvent.change(screen.getByPlaceholderText(/Brief summary/i), {
      target: { value: 'Nightly DB refresh failed' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Detailed description/i), {
      target: { value: 'Customers cannot see balances after the job failed.' },
    });
    const [, targetGroupSelect] = screen.getAllByRole('combobox');
    fireEvent.change(targetGroupSelect, { target: { value: 'group-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Incident/i }));

    await waitFor(() => expect(create.mutateAsync).toHaveBeenCalled());
  });

  it('disables the Suggest with AI button until description meets the minimum length', () => {
    localStorage.setItem('incidenthub-user-id', 'user-1');
    renderWithProviders(<CreateIncidentPage />);

    const suggestButton = screen.getByRole('button', { name: /Suggest with AI/i });
    expect(suggestButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/Detailed description/i), {
      target: { value: 'Customers cannot see balances after the job failed.' },
    });
    expect(suggestButton).not.toBeDisabled();
  });

  it('prefills severity and group with an AI-suggested badge on success', async () => {
    localStorage.setItem('incidenthub-user-id', 'user-1');
    const suggest = vi.mocked(hooks.useSuggestIncident)();
    renderWithProviders(<CreateIncidentPage />);

    fireEvent.change(screen.getByPlaceholderText(/Detailed description/i), {
      target: { value: 'Customers cannot see balances after the job failed.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Suggest with AI/i }));

    await waitFor(() => expect(suggest.mutateAsync).toHaveBeenCalledWith('Customers cannot see balances after the job failed.'));
    expect(await screen.findAllByText('AI-suggested')).toHaveLength(2);
    const [severitySelect, targetGroupSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(severitySelect.value).toBe('High');
    expect(targetGroupSelect.value).toBe('group-1');
  });

  it('shows an error state and leaves the form usable when the suggestion fails', () => {
    localStorage.setItem('incidenthub-user-id', 'user-1');
    vi.mocked(hooks.useSuggestIncident).mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('AI_UNAVAILABLE')),
      isPending: false,
      isError: true,
    } as never);
    renderWithProviders(<CreateIncidentPage />);

    fireEvent.change(screen.getByPlaceholderText(/Detailed description/i), {
      target: { value: 'Customers cannot see balances after the job failed.' },
    });

    expect(screen.getByText(/AI suggestion failed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Incident/i })).not.toBeDisabled();
  });

  it('disables the Parse with AI button until the intake text meets the minimum length', () => {
    localStorage.setItem('incidenthub-user-id', 'user-1');
    renderWithProviders(<CreateIncidentPage />);

    const parseButton = screen.getByRole('button', { name: /Parse with AI/i });
    expect(parseButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/nightly DB refresh failed in prod/i), {
      target: { value: 'nightly DB refresh failed, customers cannot see balances' },
    });
    expect(parseButton).not.toBeDisabled();
  });

  it('prefills the whole form from a parsed intake draft without auto-creating the incident', async () => {
    localStorage.setItem('incidenthub-user-id', 'user-1');
    const intake = vi.mocked(hooks.useIntakeIncident)();
    const create = vi.mocked(hooks.useCreateIncident)();
    renderWithProviders(<CreateIncidentPage />);

    fireEvent.change(screen.getByPlaceholderText(/nightly DB refresh failed in prod/i), {
      target: { value: 'nightly DB refresh failed, customers cannot see balances' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Parse with AI/i }));

    await waitFor(() => expect(intake.mutateAsync).toHaveBeenCalledWith('nightly DB refresh failed, customers cannot see balances'));
    expect(await screen.findByDisplayValue('DB refresh failed overnight')).toBeInTheDocument();
    expect(screen.getByDisplayValue('The nightly refresh job failed, balances are stale')).toBeInTheDocument();
    expect(screen.getByText(/Parsed into the form below/i)).toBeInTheDocument();
    expect(create.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows an error state and leaves the form usable when intake parsing fails', () => {
    localStorage.setItem('incidenthub-user-id', 'user-1');
    vi.mocked(hooks.useIntakeIncident).mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('PARSE_FAILED')),
      isPending: false,
      isError: true,
    } as never);
    renderWithProviders(<CreateIncidentPage />);

    fireEvent.change(screen.getByPlaceholderText(/nightly DB refresh failed in prod/i), {
      target: { value: 'nightly DB refresh failed, customers cannot see balances' },
    });

    expect(screen.getByText(/Could not parse that/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Incident/i })).not.toBeDisabled();
  });
});
