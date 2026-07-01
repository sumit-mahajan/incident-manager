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
  { userId: 'user-1', name: 'Alice', email: 'alice@x.com', createdAt: '' },
  { userId: 'user-2', name: 'Bob', email: 'bob@x.com', createdAt: '' },
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

  it('sets the active user and persists it when one is chosen', () => {
    renderWithProviders(<Navbar />);
    fireEvent.click(screen.getByText('Select user'));
    fireEvent.click(screen.getByText('Alice'));

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(localStorage.getItem('incidenthub-user-id')).toBe('user-1');
  });
});
