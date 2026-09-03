const getBackendUrl = () => {
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return "http://localhost:5000";
};

const API_BASE_URL = `${getBackendUrl()}/api`;

export async function loginUser(username, password) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed.');
  }

  return data;
}