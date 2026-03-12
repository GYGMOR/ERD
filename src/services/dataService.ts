import { supabase } from '../utils/supabaseClient';

/**
 * Zentraler Datenservice für NexService.
 * Ersetzt die Fetch-Aufrufe an das Backend (/api) durch direkte Supabase-Queries.
 * Dies ist notwendig, da auf GitHub Pages kein aktives Backend läuft.
 */

export const dataService = {
  // --- USERS ---
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    return { success: !error, data, error: error?.message };
  },

  async createUser(userData: any) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    return { success: !error, data, error: error?.message };
  },

  async updateUser(id: string, updates: any) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { success: !error, data, error: error?.message };
  },

  // --- SETTINGS ---
  async getSettings(tenantId: string) {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('tenant_id', tenantId);
    return { success: !error, data, error: error?.message };
  },

  // --- NOTIFICATIONS ---
  async getNotifications(userId: string, role: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},target_role.eq.${role}`)
      .order('created_at', { ascending: false });
    return { success: !error, data, error: error?.message };
  },

  async markNotificationAsRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    return { success: !error, error: error?.message };
  },

  // --- TICKETS ---
  async getTickets() {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, customer:users!customer_id(*), assignee:users!assignee_id(*)')
      .order('created_at', { ascending: false });
    return { success: !error, data, error: error?.message };
  },

  async getTicketById(id: string) {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:users!customer_id(*),
        assignee:users!assignee_id(*),
        messages:ticket_messages(*),
        company:companies(*)
      `)
      .eq('id', id)
      .single();
    
    if (data?.messages) {
        data.messages.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return { success: !error, data, error: error?.message };
  },

  async createTicket(ticketData: any) {
    const { data, error } = await supabase
      .from('tickets')
      .insert([ticketData])
      .select()
      .single();
    return { success: !error, data, error: error?.message };
  },

  async updateTicket(id: string, updates: any) {
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { success: !error, data, error: error?.message };
  },

  async addTicketMessage(messageData: any) {
    const { data, error } = await supabase
      .from('ticket_messages')
      .insert([messageData])
      .select()
      .single();
    return { success: !error, data, error: error?.message };
  },

  // --- COMPANIES & CUSTOMERS ---
  async getCompanies() {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name');
    return { success: !error, data, error: error?.message };
  },

  async createCompany(companyData: any) {
    const { data, error } = await supabase
      .from('companies')
      .insert([companyData])
      .select()
      .single();
    return { success: !error, data, error: error?.message };
  },

  // --- CONTACTS ---
  async getContacts() {
    const { data, error } = await supabase
      .from('contacts')
      .select('*, company:companies(*)')
      .order('last_name');
    return { success: !error, data, error: error?.message };
  },

  // --- LEADS ---
  async getLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select('*, assigned_to_user:users!assigned_to(*)')
      .order('created_at', { ascending: false });
    return { success: !error, data, error: error?.message };
  },

  // --- PROJECTS ---
  async getProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*, company:companies(*), manager:users!manager_id(*)')
      .order('created_at', { ascending: false });
    return { success: !error, data, error: error?.message };
  },

  // --- CALENDAR ---
  async getCalendarEvents(tenantId: string) {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*, created_by_user:users!created_by(*), responsible_user:users!responsible_id(*)')
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: true });
    return { success: !error, data, error: error?.message };
  },

  async createCalendarEvent(eventData: any) {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([eventData])
      .select()
      .single();
    return { success: !error, data, error: error?.message };
  }
};
