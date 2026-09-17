import { useContext } from 'react';
import { PlatformContext } from '../context/PlatformContextBase';
import type { PlatformContextType } from '../types/platform.types';

export const usePlatform = (): PlatformContextType => {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
};

export default usePlatform;
