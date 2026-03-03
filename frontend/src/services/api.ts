import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { Donation, PrasadItem, Service, DonationStats, ItemStats, User, Admin } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.api.interceptors.request.use(this.handleRequest.bind(this));
    this.api.interceptors.response.use(
      this.handleResponse.bind(this),
      this.handleError.bind(this)
    );
  }

  private handleRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
    return config;
  }

  private handleResponse(response: any) {
    console.log('Response received:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response.data;
  }

  private handleError(error: AxiosError) {
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject({
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : undefined,
      request: error.request,
      config: error.config
    });
  }

  // Auth APIs
  async login(credentials: { username: string; password: string }): Promise<{ token: string; user: User }> {
    return this.api.post('/auth/login', credentials);
  }

  async getCurrentUser(): Promise<User> {
    return this.api.get('/auth/me');
  }

  // Item APIs
  async getItems(params?: { 
    category?: string; 
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PrasadItem[]> {
    return this.api.get('/items', { params });
  }

  async createItem(item: Omit<PrasadItem, '_id' | 'createdAt' | 'updatedAt' | 'received'>): Promise<PrasadItem> {
    return this.api.post('/items', item);
  }

  async updateItem(id: string, item: Partial<PrasadItem>): Promise<PrasadItem> {
    return this.api.put(`/items/${id}`, item);
  }

  async deleteItem(id: string): Promise<{ message: string }> {
    return this.api.delete(`/items/${id}`);
  }

  async getItemStats(): Promise<ItemStats> {
    return this.api.get('/items/stats/summary');
  }

  // Bulk operations - NEW METHODS
  async bulkCreateItems(items: Partial<PrasadItem>[]): Promise<{ 
    success: boolean; 
    count: number; 
    items: PrasadItem[] 
  }> {
    return this.api.post('/items/bulk', items);
  }

  async bulkUpdateItems(items: { id: string; data: Partial<PrasadItem> }[]): Promise<{
    success: boolean;
    count: number;
    items: PrasadItem[];
  }> {
    return this.api.put('/items/bulk', items);
  }

  async bulkDeleteItems(ids: string[]): Promise<{
    success: boolean;
    count: number;
    message: string;
  }> {
    return this.api.delete('/items/bulk', { data: { ids } });
  }

  // Import/Export - NEW METHODS
  async exportItems(params?: {
    category?: string;
    format?: 'excel' | 'csv';
  }): Promise<Blob> {
    return this.api.get('/items/export', { 
      params,
      responseType: 'blob' 
    });
  }

  async importItems(file: File): Promise<{
    success: boolean;
    imported: number;
    failed: number;
    errors?: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.api.post('/items/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async validateItems(file: File): Promise<{
    valid: boolean;
    items: Partial<PrasadItem>[];
    errors?: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.api.post('/items/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async getImportTemplate(format: 'excel' | 'csv' = 'excel'): Promise<Blob> {
    return this.api.get('/items/template', {
      params: { format },
      responseType: 'blob'
    });
  }

  // Donation APIs
  async getDonations(params?: { 
    category?: string; 
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Donation[]> {
    return this.api.get('/donations', { params });
  }

  async createDonation(donation: Omit<Donation, '_id' | 'date' | 'itemName' | 'unit'>): Promise<Donation> {
    return this.api.post('/donations', donation);
  }

  async deleteDonation(id: string): Promise<{ message: string }> {
    return this.api.delete(`/donations/${id}`);
  }

  async getDonationStats(): Promise<DonationStats> {
    return this.api.get('/donations/stats/summary');
  }

  // Admin APIs
  async getAdmins(): Promise<Admin[]> {
    return this.api.get('/admins');
  }

  async getCurrentAdmin(): Promise<User> {
    return this.api.get('/admins/profile');
  }

  async createAdmin(admin: { 
    username: string; 
    email: string; 
    password: string; 
    role?: 'admin' | 'super_admin' 
  }): Promise<Admin> {
    return this.api.post('/admins', admin);
  }

  async updateAdmin(id: string, admin: Partial<Admin> & { password?: string }): Promise<Admin> {
    return this.api.put(`/admins/${id}`, admin);
  }

  async deleteAdmin(id: string): Promise<{ message: string }> {
    return this.api.delete(`/admins/${id}`);
  }

  async toggleAdminStatus(id: string): Promise<Admin> {
    return this.api.patch(`/admins/${id}/toggle-status`);
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    return this.api.put('/auth/change-password', data);
  }

  // Service APIs
  async getServices(params?: { 
    category?: string; 
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Service[]> {
    return this.api.get('/services', { params });
  }

  async createService(service: Omit<Service, '_id' | 'createdAt' | 'updatedAt'>): Promise<Service> {
    return this.api.post('/services', service);
  }

  async updateService(id: string, service: Partial<Service>): Promise<Service> {
    return this.api.put(`/services/${id}`, service);
  }

  async deleteService(id: string): Promise<{ message: string }> {
    return this.api.delete(`/services/${id}`);
  }
  
  // Public endpoints
  async getPublicItems(params?: { 
    category?: string; 
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PrasadItem[]> {
    console.log('Calling getPublicItems with params:', params);
    return this.api.get('/public/items', { params });
  }

  async createPublicDonation(donation: Omit<Donation, '_id' | 'date' | 'itemName' | 'unit'>): Promise<Donation> {
    console.log('Calling createPublicDonation with data:', donation);
    return this.api.post('/public/donations', donation);
  }
}

export default new ApiService();