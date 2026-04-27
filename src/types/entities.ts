/**
 * Shared TypeScript interfaces for database entities used across the frontend.
 */

export interface Company {
  id: string;
  tenant_id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  website: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  company_id: string | null;
  company_name: string | null;
  customer_id: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  assignee_id: string | null;
  assignee_first_name: string | null;
  assignee_last_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface LineItem {
  id?: string;
  product_id?: string;
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total_price: number;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  company_id: string | null;
  company_name: string | null;
  title: string;
  amount: string;
  status: string;
  items?: LineItem[];
  due_date: string | null;
  issue_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  tenant_id: string;
  company_id: string | null;
  company_name: string | null;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  end_date: string | null;
  ticket_count: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  company_id: string | null;
  company_name: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChartEntry {
  name: string;
  value: number;
  color: string;
}

// ─── Phase 4 Entities ─────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  tenant_id: string;
  company_name: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  notes: string | null;
  last_contact: string | null;
  next_contact: string | null;
  assigned_to: string | null;
  assigned_first_name: string | null;
  assigned_last_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  tenant_id: string;
  title: string;
  contract_number: string | null;
  contract_type: string | null;
  company_id: string | null;
  company_name: string | null;
  contact_id: string | null;
  assigned_to: string | null;
  items?: LineItem[];
  start_date: string | null;
  end_date: string | null;
  notice_period_days: number | null;
  amount: string | null;
  billing_interval: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  price: string;
  tax_rate: string | null;
  unit: string | null;
  is_recurring: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Newsletter {
  id: string;
  tenant_id: string;
  subject: string;
  title: string | null;
  content: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  created_at: string;
  updated_at: string;
}

export interface KbArticle {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  category: string | null;
  is_published: boolean;
  is_internal: boolean;
  author_first_name: string | null;
  author_last_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountingEntry {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  entry_type: string; // income | expense | invoice
  amount: string;
  currency: string;
  date: string;
  due_date: string | null;
  status: string;
  company_id: string | null;
  company_name: string | null;
  project_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessCard {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  company_name: string | null;
  company_address: string | null;
  extra_field_1: string | null;
  extra_field_2: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  company_id: string;
  event_type: string;
  title: string;
  description: string | null;
  related_id: string | null;
  created_at: string;
}


export interface Notification {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  target_role: string | null;
  type: 'ticket' | 'project' | 'invoice' | 'contract' | 'calendar';
  entity_id: string | null;
  title: string;
  message: string;
  priority: 'info' | 'normal' | 'high' | 'critical';
  is_read: boolean;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'manager' | 'employee' | 'customer' | 'client';
