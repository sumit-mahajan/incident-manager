import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';
import { Navbar } from './Navbar';
import * as hooks from '../features/incidents/hooks';

vi.mock('../features/incidents/hooks', async () => {
  const actual = await vi.importActual<typeof import('../features/incidents/hooks')>(
    '../features/incidents/hooks'
  );
  return { ...actual, useUsers: vi.fn(), useUserGroups: vi.fn() };
});

const users = [
  {
    userId: 'user-1',
    name: 'Alice',
    email: 'alice@x.com',
    createdAt: '',
    groups: [{ groupId: 'group-1', name: 'DBA', description: '', createdAt: '' }],
  },
  { userId: 'user-2', name: 'Bob', email: 'bob@x.com', createdAt: '', groups: [] },
];

describe('Navbar user switcher', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(hooks.useUsers).mockReturnValue({ data: users } as never);
    vi.mocked(hooks.useUserGroups).mockReturnValue({ data: [] } as never);
  });

  it('prompts to select a user when none is active', () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByText('Select user')).toBeInTheDocument();
  });

  it('lists seeded users in the dropdown when opened', () => {
    renderWithProviders(<Navbar />);
    fireEvent.click(screen.getByText('Select user'));
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows each user\'s group in the dropdown instead of their email', () => {
    renderWithProviders(<Navbar />);
    fireEvent.click(screen.getByText('Select user'));
    expect(screen.getByText('DBA')).toBeInTheDocument();
    expect(screen.queryByText('alice@x.com')).not.toBeInTheDocument();
  });

  it('shows a fallback when a user has no group', () => {
    renderWithProviders(<Navbar />);
    fireEvent.click(screen.getByText('Select user'));
    expect(screen.getByText('No group')).toBeInTheDocument();
  });

  it('sets the active user and persists it when one is chosen', () => {
    renderWithProviders(<Navbar />);
    fireEvent.click(screen.getByText('Select user'));
    fireEvent.click(screen.getByText('Alice'));

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(localStorage.getItem('incidenthub-user-id')).toBe('user-1');
  });
});
