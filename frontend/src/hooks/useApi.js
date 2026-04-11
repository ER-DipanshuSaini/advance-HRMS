import { useState, useCallback } from 'react';
import { apiClient } from '../api/apiClient';

/**
 * Custom hook to handle API calls with loading, error, and data state.
 */
export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const responseData = await apiClient(endpoint, options);
      setData(responseData);
      return responseData;
    } catch (err) {
      setError(err.message || 'An error occurred during the API request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, data, request, setData };
}
