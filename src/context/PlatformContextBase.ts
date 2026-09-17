import { createContext } from 'react';
import type { PlatformContextType } from '../types/platform.types';

export const PlatformContext = createContext<PlatformContextType | null>(null);
