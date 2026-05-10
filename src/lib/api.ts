const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const api = {
  get: async (url: string) => {
    const separator = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${separator}_t=${Date.now()}`, { headers: getAuthHeaders() });
    if (res.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login') && !url.includes('/api/auth/login')) {
         window.location.href = '/login';
      }
      return Promise.reject({ status: 401, error: 'Session Expired', message: 'Please log in again.' });
    }
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (!res.ok) throw json;
      return json;
    } catch (err: any) {
      if (!res.ok) {
        if (typeof err === 'object' && err !== null && 'error' in err) throw err;
        throw new Error(`Server Error: ${res.status} ${res.statusText}`);
      }
      return text;
    }
  },
  post: async (url: string, data: any) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (res.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login') && !url.includes('/api/auth/login')) {
         window.location.href = '/login';
      }
      return Promise.reject({ status: 401, error: 'Session Expired', message: 'Please log in again.' });
    }
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (!res.ok) throw json;
      return json;
    } catch (err: any) {
      if (!res.ok) {
        if (typeof err === 'object' && err !== null && 'error' in err) throw err;
        throw new Error(`Server Error: ${res.status} ${res.statusText}`);
      }
      return text;
    }
  },
  patch: async (url: string, data: any) => {
    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(data)
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('/login') && !url.includes('/api/auth/login')) {
           window.location.href = '/login';
        }
        return Promise.reject({ status: 401, error: 'Session Expired', message: 'Please log in again.' });
      }
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (!res.ok) throw json;
        return json;
      } catch (err: any) {
        if (!res.ok) {
          if (typeof err === 'object' && err !== null && 'error' in err) throw err;
          throw new Error(`Server Error: ${res.status} ${res.statusText}`);
        }
        return text;
      }
  },
  delete: async (url: string) => {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login') && !url.includes('/api/auth/login')) {
         window.location.href = '/login';
      }
      return Promise.reject({ status: 401, error: 'Session Expired', message: 'Please log in again.' });
    }
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (!res.ok) throw json;
      return json;
    } catch (err: any) {
      if (!res.ok) {
        if (typeof err === 'object' && err !== null && 'error' in err) throw err;
        throw new Error(`Server Error: ${res.status} ${res.statusText}`);
      }
      return text;
    }
  }
};
