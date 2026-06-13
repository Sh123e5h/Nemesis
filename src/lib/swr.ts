import type { SWRConfiguration } from 'swr';
import { supabase } from './supabase';

/**
 * Global SWR Fetcher for Supabase
 * Directly handles table queries and returns data or throws errors.
 */
export const fetcher = async (key: string) => {
  const [table, ...segments] = key.split(':');
  
  // Example key: 'tasks:all'
  const query = supabase.from(table).select('*');
  
  if (segments.length > 0) {
     // Add more complex filtering logic as needed here
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

/**
 * Global SWR Configuration
 */
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  refreshInterval: 0, // Disable auto-poll to save bandwidth; focus revalidation is faster
  dedupingInterval: 15000, // 15s deduplication
  errorRetryCount: 3,
};
