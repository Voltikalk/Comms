import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { SERVER_URL } from '../constants';
import authService from '../services/auth.service';
import { ConnectionContext, useAuth, type ConnectionContextValue } from './contexts';

const AUTH_FAILURE = /Authentication|Token missing|revoked/i;

/**
 * Owns the Socket.io connection. The handshake reads the in-memory access
 * token through an `auth` callback, so every reconnect uses the latest rotated
 * token; an auth failure triggers one silent cookie refresh before signing out.
 */
export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, endSession } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const endSessionRef = useRef(endSession);

  useEffect(() => {
    endSessionRef.current = endSession;
  }, [endSession]);

  useEffect(() => {
    if (!currentUser) return;

    const s = io(SERVER_URL, {
      auth: (cb) => cb({ token: authService.getAccessToken() ?? '' }),
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = s;
    setSocket(s);
    let renewed = false;

    s.on('connect', () => {
      renewed = false;
      setIsConnected(true);
      setError(null);
    });

    s.on('disconnect', () => setIsConnected(false));

    s.on('connect_error', async (err: Error) => {
      setIsConnected(false);
      const msg = err?.message || '';
      if (AUTH_FAILURE.test(msg)) {
        // Middleware rejections are not retried automatically: renew once, then reconnect.
        if (!renewed) {
          renewed = true;
          if (await authService.refresh()) {
            s.connect();
            return;
          }
        }
        endSessionRef.current('Сессия истекла или недействительна. Выполните вход снова.');
        return;
      }
      setError('Не удалось подключиться к серверу. Убедитесь, что сервер чата запущен.');
    });

    s.on('auth_error', (data?: { message?: string; reason?: string }) => {
      endSessionRef.current(
        data?.reason === 'terminated_by_user'
          ? 'Этот сеанс был завершён с другого устройства.'
          : data?.message || 'Сессия завершена. Выполните вход снова.',
      );
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [currentUser]);

  const emitWithAck = useCallback(
    <T,>(event: string, payload: unknown, timeoutMs = 5000) =>
      new Promise<T | null>((resolve) => {
        const s = socketRef.current;
        if (!s || !s.connected) {
          resolve(null);
          return;
        }
        s.timeout(timeoutMs).emit(event, payload, (err: Error | null, response: T) => resolve(err ? null : response));
      }),
    [],
  );

  const value = useMemo<ConnectionContextValue>(
    () => ({ socket, isConnected, error, setError, emitWithAck }),
    [socket, isConnected, error, emitWithAck],
  );

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
};
