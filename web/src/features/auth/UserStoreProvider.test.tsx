import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserStoreProvider, useUserStore } from './UserStoreProvider';

function Consumer() {
  const { activeUserId, setActiveUser } = useUserStore();
  return (
    <div>
      <span data-testid="active-user">{activeUserId ?? 'none'}</span>
      <button onClick={() => setActiveUser('user-7')}>switch</button>
    </div>
  );
}

function renderWithQueryClient() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <UserStoreProvider>
        <Consumer />
      </UserStoreProvider>
    </QueryClientProvider>
  );
}

describe('UserStoreProvider', () => {
  beforeEach(() => localStorage.clear());

  it('starts with no active user when nothing is stored', () => {
    renderWithQueryClient();
    expect(screen.getByTestId('active-user')).toHaveTextContent('none');
  });

  it('picks up a previously stored active user id on mount', () => {
    localStorage.setItem('incidenthub-user-id', 'user-3');
    renderWithQueryClient();
    expect(screen.getByTestId('active-user')).toHaveTextContent('user-3');
  });

  it('updates context and localStorage when switching the active user', () => {
    renderWithQueryClient();
    fireEvent.click(screen.getByText('switch'));

    expect(screen.getByTestId('active-user')).toHaveTextContent('user-7');
    expect(localStorage.getItem('incidenthub-user-id')).toBe('user-7');
  });
});
