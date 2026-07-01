import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setStoredUserId, getActiveUserId } from '../../lib/apiClient';

interface UserStoreCtx {
  activeUserId: string | null;
  setActiveUser: (userId: string) => void;
}

const UserStoreContext = createContext<UserStoreCtx>({
  activeUserId: null,
  setActiveUser: () => {},
});

export function UserStoreProvider({ children }: { children: ReactNode }) {
  const [activeUserId, setActiveUserId] = useState<string | null>(getActiveUserId);
  const queryClient = useQueryClient();

  const setActiveUser = useCallback(
    (userId: string) => {
      setStoredUserId(userId);
      setActiveUserId(userId);
      queryClient.invalidateQueries();
    },
    [queryClient]
  );

  return (
    <UserStoreContext.Provider value={{ activeUserId, setActiveUser }}>
      {children}
    </UserStoreContext.Provider>
  );
}

export function useUserStore() {
  return useContext(UserStoreContext);
}
