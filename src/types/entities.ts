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

export interface Invoice {
  id: string;
  tenant_id: string;
  company_id: string | null;
  company_name: string | null;
  title: string;
  amount: string;
  status: string;
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
