// frontend/lib/api.js
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://45.9.40.4/api';

export async function fetchAPI(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  return response.json();
}