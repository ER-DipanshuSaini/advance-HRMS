import { apiClient } from './apiClient';

export const recruitmentService = {
  /**
   * Fetches all recruitment positions/pipelines from the backend.
   */
  getPositions: async (status = null) => {
    let endpoint = '/recruitment/positions/';
    if (status) {
      endpoint += `?status=${status}`;
    }
    return await apiClient(endpoint);
  },

  /**
   * Creates a new recruitment position.
   */
  createPosition: async (data) => {
    return await apiClient('/recruitment/positions/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Fetches all departments for selection dropdowns.
   */
  getDepartments: async () => {
    return await apiClient('/org/departments/');
  }
};
