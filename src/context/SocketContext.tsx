import React from 'react';
import { AuthProvider } from './AuthContext';
import { ConnectionProvider } from './ConnectionContext';
import { RoomsProvider } from './RoomsContext';
import { MessagesProvider } from './MessagesContext';
import { CallProvider } from './CallContext';

/**
 * App state root. Each layer only depends on the ones above it:
 * Auth (JWT session) → Connection (socket) → Rooms → Messages → Call.
 * Components read state via the focused hooks in `./contexts`
 * (`useAuth`, `useRooms`, `useMessages`, `useCall`) or the `useSocket()` facade.
 */
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <ConnectionProvider>
      <RoomsProvider>
        <MessagesProvider>
          <CallProvider>{children}</CallProvider>
        </MessagesProvider>
      </RoomsProvider>
    </ConnectionProvider>
  </AuthProvider>
);
