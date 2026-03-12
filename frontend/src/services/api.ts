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
    
    // Log request details for debugging
    console.log(`🌐 Making ${config.method?.toUpperCase()} request to:`, config.url);
    
    // Don't log FormData as it will be empty in console
    if (config.data instanceof FormData) {
      console.log('📦 Request contains FormData with fields:', 
        Array.from((config.data as FormData).keys()));
    } else if (config.data) {
      console.log('📦 Request data:', config.data);
    }
    
    if (config.params) {
      console.log('🔍 Request params:', config.params);
    }
    
    return config;
  }

  private handleResponse(response: any) {
    console.log('✅ Response received:', {
      url: response.config.url,
      status: response.status,
      statusText: response.statusText
    });
    return response.data;
  }

  private handleError(error: AxiosError) {
    // Enhanced error logging
    console.error('❌ API Error Details:', {
      message: error.message,
      code: error.code,
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      requestData: error.config?.data instanceof FormData 
        ? 'FormData (see network tab for details)' 
        : error.config?.data
    });

    // Log FormData contents if present
    if (error.config?.data instanceof FormData) {
      const formData = error.config.data;
      console.log('📦 FormData contents:');
      for (let pair of (formData as any).entries()) {
        if (pair[1] instanceof File) {
          console.log(`   ${pair[0]}: File - ${pair[1].name} (${pair[1].type}, ${pair[1].size} bytes)`);
        } else {
          console.log(`   ${pair[0]}: ${pair[1]}`);
        }
      }
    }

    // Check for specific error types
    if (error.code === 'ERR_NETWORK') {
      console.error('🔌 Network error - check if server is running at:', API_URL);
    } else if (error.response?.status === 500) {
      console.error('💥 Server error - check server logs for details');
    } else if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Transform error for consistent handling
    const enhancedError = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code,
      originalError: error
    };

    return Promise.reject(enhancedError);
  }

  // Auth APIs
  async login(credentials: { username: string; password: string }): Promise<{ token: string; user: User }> {
    try {
      return await this.api.post('/auth/login', credentials);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      return await this.api.get('/auth/me');
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  }

  // Item APIs
  async getItems(params?: { 
    category?: string; 
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PrasadItem[]> {
    try {
      return await this.api.get('/items', { params });
    } catch (error) {
      console.error('Failed to fetch items:', error);
      throw error;
    }
  }

  async createItem(item: Omit<PrasadItem, '_id' | 'createdAt' | 'updatedAt' | 'received'>): Promise<PrasadItem> {
    try {
      return await this.api.post('/items', item);
    } catch (error) {
      console.error('Failed to create item:', error);
      throw error;
    }
  }

  async updateItem(id: string, item: Partial<PrasadItem>): Promise<PrasadItem> {
    try {
      return await this.api.put(`/items/${id}`, item);
    } catch (error) {
      console.error(`Failed to update item ${id}:`, error);
      throw error;
    }
  }

  async deleteItem(id: string): Promise<{ message: string }> {
    try {
      return await this.api.delete(`/items/${id}`);
    } catch (error) {
      console.error(`Failed to delete item ${id}:`, error);
      throw error;
    }
  }

  async getItemStats(): Promise<ItemStats> {
    try {
      return await this.api.get('/items/stats/summary');
    } catch (error) {
      console.error('Failed to fetch item stats:', error);
      throw error;
    }
  }

  // Bulk operations
  async bulkCreateItems(items: Partial<PrasadItem>[]): Promise<{ 
    success: boolean; 
    count: number; 
    items: PrasadItem[] 
  }> {
    try {
      return await this.api.post('/items/bulk', items);
    } catch (error) {
      console.error('Failed to bulk create items:', error);
      throw error;
    }
  }

  async bulkUpdateItems(items: { id: string; data: Partial<PrasadItem> }[]): Promise<{
    success: boolean;
    count: number;
    items: PrasadItem[];
  }> {
    try {
      return await this.api.put('/items/bulk', items);
    } catch (error) {
      console.error('Failed to bulk update items:', error);
      throw error;
    }
  }

  async bulkDeleteItems(ids: string[]): Promise<{
    success: boolean;
    count: number;
    message: string;
  }> {
    try {
      return await this.api.delete('/items/bulk', { data: { ids } });
    } catch (error) {
      console.error('Failed to bulk delete items:', error);
      throw error;
    }
  }

  // Import/Export
  async exportItems(params?: {
    category?: string;
    format?: 'excel' | 'csv';
  }): Promise<Blob> {
    try {
      return await this.api.get('/items/export', { 
        params,
        responseType: 'blob' 
      });
    } catch (error) {
      console.error('Failed to export items:', error);
      throw error;
    }
  }

  async importItems(file: File): Promise<{
    success: boolean;
    imported: number;
    failed: number;
    errors?: string[];
    message?: string;
  }> {
    try {
      // Validate file before sending
      if (!file) {
        throw new Error('No file provided');
      }

      // Check file extension
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const validExts = ['xlsx', 'xls', 'csv'];
      
      if (!validExts.includes(fileExt || '')) {
        throw new Error(`अवैध फाइल प्रकार: .${fileExt}. कृपया .xlsx, .xls किंवा .csv फाइल निवडा.`);
      }

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error(`फाइल खूप मोठी आहे: ${(file.size / 1024 / 1024).toFixed(2)}MB. कमाल आकार 10MB आहे.`);
      }

      console.log('📤 Uploading file:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        extension: fileExt
      });

      const formData = new FormData();
      formData.append('file', file);
      
      // Log FormData contents
      console.log('📦 FormData entries:');
      for (let pair of (formData as any).entries()) {
        if (pair[1] instanceof File) {
          console.log(`   ${pair[0]}: File - ${pair[1].name} (${pair[1].type}, ${pair[1].size} bytes)`);
        } else {
          console.log(`   ${pair[0]}: ${pair[1]}`);
        }
      }
      
      return await this.api.post('/items/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout for large files
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`📤 Upload progress: ${percentCompleted}%`);
          }
        }
      });
    } catch (error: any) {
      console.error('❌ Import failed:', error);
      
      // Provide more user-friendly error messages
      if (error.code === 'ECONNABORTED') {
        throw new Error('अपलोड टाइमआउट. कृपया लहान फाइल वापरून प्रयत्न करा.');
      }
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        if (error.response.status === 404) {
          throw new Error('इम्पोर्ट API उपलब्ध नाही. कृपया थेट फॉर्म वापरून वस्तू जोडा.');
        }
        
        if (error.response.status === 413) {
          throw new Error('फाइल खूप मोठी आहे. कृपया लहान फाइल वापरून प्रयत्न करा.');
        }
        
        if (error.response.data?.message) {
          throw new Error(error.response.data.message);
        }
        
        if (error.response.data?.error) {
          throw new Error(error.response.data.error);
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        throw new Error('सर्व्हरकडून प्रतिसाद मिळाला नाही. कृपया नेटवर्क तपासा.');
      }
      
      // Use the error message from the enhanced error object
      if (error.data?.message) {
        throw new Error(error.data.message);
      }
      
      throw new Error(error.message || 'अपलोड करताना त्रुटी आली');
    }
  }

  async validateItems(file: File): Promise<{
    valid: boolean;
    items: Partial<PrasadItem>[];
    errors?: string[];
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      return await this.api.post('/items/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      console.error('Failed to validate items:', error);
      throw error;
    }
  }

  async getImportTemplate(format: 'excel' | 'csv' = 'excel'): Promise<Blob> {
    try {
      return await this.api.get('/items/template', {
        params: { format },
        responseType: 'blob'
      });
    } catch (error) {
      console.error('Failed to get import template:', error);
      throw error;
    }
  }

  // Donation APIs
  async getDonations(params?: { 
    category?: string; 
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Donation[]> {
    try {
      return await this.api.get('/donations', { params });
    } catch (error) {
      console.error('Failed to fetch donations:', error);
      throw error;
    }
  }

  async createDonation(donation: Omit<Donation, '_id' | 'date' | 'itemName' | 'unit'>): Promise<Donation> {
    try {
      return await this.api.post('/donations', donation);
    } catch (error) {
      console.error('Failed to create donation:', error);
      throw error;
    }
  }

  async deleteDonation(id: string): Promise<{ message: string }> {
    try {
      return await this.api.delete(`/donations/${id}`);
    } catch (error) {
      console.error(`Failed to delete donation ${id}:`, error);
      throw error;
    }
  }

  async getDonationStats(): Promise<DonationStats> {
    try {
      return await this.api.get('/donations/stats/summary');
    } catch (error) {
      console.error('Failed to fetch donation stats:', error);
      throw error;
    }
  }

  // Admin APIs
  async getAdmins(): Promise<Admin[]> {
    try {
      return await this.api.get('/admins');
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      throw error;
    }
  }

  async getCurrentAdmin(): Promise<User> {
    try {
      return await this.api.get('/admins/profile');
    } catch (error) {
      console.error('Failed to fetch current admin:', error);
      throw error;
    }
  }

  async createAdmin(admin: { 
    username: string; 
    email: string; 
    password: string; 
    role?: 'admin' | 'super_admin' 
  }): Promise<Admin> {
    try {
      return await this.api.post('/admins', admin);
    } catch (error) {
      console.error('Failed to create admin:', error);
      throw error;
    }
  }

  async updateAdmin(id: string, admin: Partial<Admin> & { password?: string }): Promise<Admin> {
    try {
      return await this.api.put(`/admins/${id}`, admin);
    } catch (error) {
      console.error(`Failed to update admin ${id}:`, error);
      throw error;
    }
  }

  async deleteAdmin(id: string): Promise<{ message: string }> {
    try {
      return await this.api.delete(`/admins/${id}`);
    } catch (error) {
      console.error(`Failed to delete admin ${id}:`, error);
      throw error;
    }
  }

  async toggleAdminStatus(id: string): Promise<Admin> {
    try {
      return await this.api.patch(`/admins/${id}/toggle-status`);
    } catch (error) {
      console.error(`Failed to toggle admin status ${id}:`, error);
      throw error;
    }
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    try {
      return await this.api.put('/auth/change-password', data);
    } catch (error) {
      console.error('Failed to change password:', error);
      throw error;
    }
  }

  // Service APIs
  async getServices(params?: { 
    category?: string; 
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Service[]> {
    try {
      return await this.api.get('/services', { params });
    } catch (error) {
      console.error('Failed to fetch services:', error);
      throw error;
    }
  }

  async createService(service: Omit<Service, '_id' | 'createdAt' | 'updatedAt'>): Promise<Service> {
    try {
      return await this.api.post('/services', service);
    } catch (error) {
      console.error('Failed to create service:', error);
      throw error;
    }
  }

  async updateService(id: string, service: Partial<Service>): Promise<Service> {
    try {
      return await this.api.put(`/services/${id}`, service);
    } catch (error) {
      console.error(`Failed to update service ${id}:`, error);
      throw error;
    }
  }

  async deleteService(id: string): Promise<{ message: string }> {
    try {
      return await this.api.delete(`/services/${id}`);
    } catch (error) {
      console.error(`Failed to delete service ${id}:`, error);
      throw error;
    }
  }
  
  // Public endpoints
  async getPublicItems(params?: { 
    category?: string; 
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PrasadItem[]> {
    try {
      console.log('📞 Calling getPublicItems with params:', params);
      return await this.api.get('/public/items', { params });
    } catch (error) {
      console.error('Failed to fetch public items:', error);
      throw error;
    }
  }

  // NEW: Public Services endpoints
  async getPublicServices(params?: { 
    category?: string; 
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Service[]> {
    try {
      console.log('📞 Calling getPublicServices with params:', params);
      return await this.api.get('/public/services', { params });
    } catch (error) {
      console.error('Failed to fetch public services:', error);
      throw error;
    }
  }

  async getPublicServiceById(id: string): Promise<Service> {
    try {
      console.log('📞 Calling getPublicServiceById with id:', id);
      return await this.api.get(`/public/services/${id}`);
    } catch (error) {
      console.error('Failed to fetch public service:', error);
      throw error;
    }
  }

  async createPublicDonation(donation: Omit<Donation, '_id' | 'date' | 'itemName' | 'unit'>): Promise<Donation> {
    try {
      console.log('📞 Calling createPublicDonation with data:', donation);
      return await this.api.post('/public/donations', donation);
    } catch (error) {
      console.error('Failed to create public donation:', error);
      throw error;
    }
  }
}

// Create a single instance
const apiService = new ApiService();

// Export only the instance as default
export default apiService;