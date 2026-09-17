import { useContext } from 'react';
import { StoriesContext, type StoriesContextType } from '../context/StoriesContextBase';

export const useStories = (): StoriesContextType => {
  const ctx = useContext(StoriesContext);
  if (!ctx) throw new Error('useStories must be used within StoriesProvider');
  return ctx;
};

export default useStories;
