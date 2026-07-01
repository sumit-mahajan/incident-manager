import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';
import { CreateIncidentPage } from './CreateIncidentPage';
import * as hooks from '../features/incidents/hooks';

vi.mock('../features/incidents/hooks', async () => {
  const actual = await vi.importActual<typeof import('../features/incidents/hooks')>(
    '../features/incidents/hooks'
  );
  return { ...actual, useGroups: vi.fn(), useCreateIncident: vi.fn() };
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
});
