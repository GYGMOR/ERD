/**
 * Zentraler Datenservice für NexService.
 * Nutzt das Express-Backend (/api).
 */

const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

async function handleResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const dataService = {
  // --- USERS ---
  async getUsers(params?: { includeCustomers?: boolean }) {
    try {
      const query = params?.includeCustomers ? '?includeCustomers=true' : '';
      const data = await fetch(`${API_BASE}/users${query}`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async createUser(userData: any) {
    try {
      const data = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(userData)
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async updateUser(id: string, updates: any) {
    try {
      const data = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // --- SETTINGS ---
  async getSettings(tenantId: string) {
    try {
      const data = await fetch(`${API_BASE}/settings?tenantId=${tenantId}`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async updateSettings(category: string, updates: any) {
    try {
      const data = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ category, updates })
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // --- NOTIFICATIONS ---
  async getNotifications(userId: string, role: string) {
    try {
      const data = await fetch(`${API_BASE}/notifications?userId=${userId}&role=${role}`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async markNotificationAsRead(id: string) {
    try {
      const data = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getHeaders()
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async markAllNotificationsAsRead() {
    try {
      const data = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'POST',
        headers: getHeaders()
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // --- TICKETS ---
  async getTickets() {
    try {
      const data = await fetch(`${API_BASE}/tickets`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async getPortalTickets() {
    try {
      const data = await fetch(`${API_BASE}/portal/tickets`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async getTicketById(id: string) {
    try {
      const ticket = await fetch(`${API_BASE}/tickets/${id}`, { headers: getHeaders() }).then(handleResponse);
      const comments = await fetch(`${API_BASE}/tickets/${id}/comments`, { headers: getHeaders() }).then(handleResponse);
      
      return { 
        success: true, 
        data: { 
          ...ticket.data, 
          messages: comments.data 
        } 
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async createTicket(ticketData: any) {
    try {
      const data = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(ticketData)
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async updateTicket(id: string, updates: any) {
    try {
      const data = await fetch(`${API_BASE}/tickets/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async addTicketMessage(ticketId: string, messageData: any) {
    try {
      const data = await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(messageData)
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // --- COMPANIES & CUSTOMERS ---
  async getCompanies() {
    try {
      const data = await fetch(`${API_BASE}/companies`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async createCompany(companyData: any) {
    try {
      const data = await fetch(`${API_BASE}/companies`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(companyData)
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // --- CONTACTS ---
  async getContacts() {
    try {
      const data = await fetch(`${API_BASE}/contacts`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async createContact(contactData: any) {
    try {
      const data = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(contactData)
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // --- LEADS ---
  async getLeads() {
    try {
      const data = await fetch(`${API_BASE}/leads`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async createLead(leadData: any) {
    try {
      const data = await fetch(`${API_BASE}/leads`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(leadData)
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async updateLead(id: string, updates: any) {
    try {
      const data = await fetch(`${API_BASE}/leads/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // --- PROJECTS ---
  async getProjects() {
    try {
      const data = await fetch(`${API_BASE}/projects`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async getPortalProjects() {
    try {
      const data = await fetch(`${API_BASE}/portal/projects`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async getPortalInvoices() {
    try {
      const data = await fetch(`${API_BASE}/portal/invoices`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async getPortalContracts() {
    try {
      const data = await fetch(`${API_BASE}/portal/contracts`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async getPortalOffers() {
    try {
      const data = await fetch(`${API_BASE}/portal/offers`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // --- CALENDAR ---
  async getCalendarEvents(params?: { userIds?: string[], start?: string, end?: string }) {
    try {
      const searchParams = new URLSearchParams();
      if (params?.userIds) searchParams.append('userIds', params.userIds.join(','));
      if (params?.start) searchParams.append('start', params.start);
      if (params?.end) searchParams.append('end', params.end);
      
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const data = await fetch(`${API_BASE}/calendar/events${query}`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async createCalendarEvent(eventData: any) {
    try {
      const data = await fetch(`${API_BASE}/calendar/events`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(eventData)
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async updateCalendarEvent(id: string, updates: any) {
    try {
      const data = await fetch(`${API_BASE}/calendar/events/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
  
  async rsvpCalendarEvent(id: string, status: 'confirmed' | 'declined') {
    try {
      const data = await fetch(`${API_BASE}/calendar/events/${id}/rsvp`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status })
      }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // --- DASHBOARD & TIMELINE ---
  async getDashboardMetrics() {
    try {
      const data = await fetch(`${API_BASE}/dashboard/metrics`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async getPortalDashboard() {
    try {
      const data = await fetch(`${API_BASE}/portal/dashboard`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async getTimelineEvents(limit: number = 5) {
    try {
      const data = await fetch(`${API_BASE}/timeline?limit=${limit}`, { headers: getHeaders() }).then(handleResponse);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};
