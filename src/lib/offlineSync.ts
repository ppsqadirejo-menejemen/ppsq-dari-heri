import axios from 'axios';

export interface OfflineQueueItem {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data: any;
  timestamp: number;
  phone?: string; // For WhatsApp notification
}

export const getOfflineQueue = (): OfflineQueueItem[] => {
  const queue = localStorage.getItem('offline_input_queue');
  return queue ? JSON.parse(queue) : [];
};

export const addToOfflineQueue = (item: Omit<OfflineQueueItem, 'id' | 'timestamp'>) => {
  const queue = getOfflineQueue();
  const newItem: OfflineQueueItem = {
    ...item,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
  };
  queue.push(newItem);
  localStorage.setItem('offline_input_queue', JSON.stringify(queue));
  
  // Dispatch custom event to update UI
  window.dispatchEvent(new Event('offlineQueueUpdated'));
};

export const removeFromOfflineQueue = (id: string) => {
  const queue = getOfflineQueue();
  const newQueue = queue.filter(item => item.id !== id);
  localStorage.setItem('offline_input_queue', JSON.stringify(newQueue));
  
  // Dispatch custom event to update UI
  window.dispatchEvent(new Event('offlineQueueUpdated'));
};

export const syncOfflineData = async () => {
  if (!navigator.onLine) return;

  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  console.log(`Starting sync of ${queue.length} items...`);

  for (const item of queue) {
    try {
      // If it's a FormData (like file upload), we can't easily serialize it to localStorage.
      // Assuming our offline queue mostly handles JSON data.
      await axios({
        method: item.method,
        url: item.url,
        data: item.data,
      });
      
      // Remove from queue after successful sync
      removeFromOfflineQueue(item.id);
      console.log(`Successfully synced item ${item.id}`);
      
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);
      // Stop sync if one fails to maintain order, or continue?
      // Usually better to stop and try again later if it's a network issue.
      break; 
    }
  }
};

// Listen for online event to trigger sync
window.addEventListener('online', () => {
  console.log('Browser is online. Triggering sync...');
  syncOfflineData();
});

// Helper for caching GET requests
export const fetchWithCache = async (url: string) => {
  const cacheKey = `cache_${url}`;
  
  // Try to get from cache first
  const cachedData = localStorage.getItem(cacheKey);
  let parsedCache = null;
  if (cachedData) {
    try {
      parsedCache = JSON.parse(cachedData);
    } catch (e) {
      console.error('Failed to parse cached data for', url);
    }
  }

  // If online, fetch fresh data
  if (navigator.onLine) {
    try {
      const response = await axios.get(url);
      localStorage.setItem(cacheKey, JSON.stringify(response.data));
      return { data: response.data, fromCache: false };
    } catch (error) {
      console.error(`Failed to fetch ${url}, falling back to cache if available`, error);
      if (parsedCache) {
        return { data: parsedCache, fromCache: true };
      }
      throw error;
    }
  } else {
    // Offline, return cache
    if (parsedCache) {
      return { data: parsedCache, fromCache: true };
    }
    throw new Error('Offline and no cache available');
  }
};

// Helper for POST requests with offline queue
export const postWithOfflineQueue = async (url: string, data: any, config?: any) => {
  if (navigator.onLine) {
    return axios.post(url, data, config);
  } else {
    // If it's FormData, we can't easily serialize it. We'll throw an error for now.
    if (data instanceof FormData) {
      throw new Error('File uploads are not supported in offline mode.');
    }
    
    addToOfflineQueue({
      url,
      method: 'POST',
      data,
    });
    
    console.log(`Saved to offline queue: POST ${url}`);
    // Return a mock successful response
    return { data: { success: true, offline: true } };
  }
};
