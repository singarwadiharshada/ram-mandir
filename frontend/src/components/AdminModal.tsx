import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { Admin, User } from '../types';
import './AdminModal.css';

interface AdminModalProps {
  admin: Admin | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  currentUser: User; // Add this prop to know if current user is super admin
}

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'super_admin';
}

const AdminModal: React.FC<AdminModalProps> = ({ 
  admin, 
  onClose, 
  onSuccess, 
  showToast,
  currentUser  // Receive current user from parent
}) => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin'
  });

  useEffect(() => {
    if (admin) {
      setFormData({
        username: admin.username,
        email: admin.email,
        password: '',
        confirmPassword: '',
        role: admin.role
      });
    }
  }, [admin]);

  const createMutation = useMutation({
    mutationFn: (data: Omit<FormData, 'confirmPassword'>) => api.createAdmin(data),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      showToast(error.error || 'काहीतरी चूक झाली', 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Admin>) => api.updateAdmin(admin!._id, data),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      showToast(error.error || 'काहीतरी चूक झाली', 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.email) {
      showToast('कृपया सर्व आवश्यक माहिती भरा', 'error');
      return;
    }

    if (!admin && !formData.password) {
      showToast('पासवर्ड आवश्यक आहे', 'error');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      showToast('पासवर्ड जुळत नाहीत', 'error');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      showToast('पासवर्ड किमान ६ अक्षरांचा असावा', 'error');
      return;
    }

    // Prevent creating another super admin if one already exists
    if (!admin && formData.role === 'super_admin' && !currentUser.isSuperAdmin) {
      showToast('फक्त मुख्य प्रशासक दुसरा मुख्य प्रशासक तयार करू शकतो', 'error');
      return;
    }

    if (admin) {
      // Update existing admin
      const updateData: any = {
        username: formData.username,
        email: formData.email,
      };
      
      // Only super admin can change role
      if (currentUser.isSuperAdmin) {
        updateData.role = formData.role;
      }
      
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateMutation.mutate(updateData);
    } else {
      // Create new admin
      createMutation.mutate({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Check if this is a super admin being edited
  const isEditingSuperAdmin = admin?.role === 'super_admin';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{admin ? 'प्रशासक संपादित करा' : 'नवीन प्रशासक जोडा'}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>वापरकर्ता नाव *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="उदा. admin"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label>ईमेल *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@example.com"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label>भूमिका</label>
            
            {/* Show warning if this is a super admin being viewed */}
            {isEditingSuperAdmin ? (
              <div className="role-warning">
                ⚠️ मुख्य प्रशासक (Super Admin) - ही भूमिका बदलता येत नाही
              </div>
            ) : (
              <>
                {/* If current user is super admin, show both options */}
                {currentUser.isSuperAdmin ? (
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'super_admin' })}
                    disabled={isLoading}
                  >
                    <option value="admin">प्रशासक (Admin)</option>
                    <option value="super_admin">मुख्य प्रशासक (Super Admin)</option>
                  </select>
                ) : (
                  /* If current user is regular admin, only show admin option */
                  <select
                    value="admin"
                    disabled={true}
                  >
                    <option value="admin">प्रशासक (Admin)</option>
                  </select>
                )}
                
                {/* Show warning when trying to create super admin */}
                {!admin && formData.role === 'super_admin' && (
                  <div className="role-warning">
                    ⚠️ फक्त एकच मुख्य प्रशासक असू शकतो. ही भूमिका निवडल्यास सध्याचा मुख्य प्रशासक आपोआप 
                    काढला जाईल.
                  </div>
                )}
              </>
            )}
          </div>

          <div className="form-group">
            <label>{admin ? 'नवीन पासवर्ड (एकदम सोडा)' : 'पासवर्ड *'}</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              disabled={isLoading}
              required={!admin}
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>पासवर्ड पुन्हा टाका {!admin && '*'}</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="••••••••"
              disabled={isLoading}
              required={!admin}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>
              रद्द करा
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'जतन करत आहे...' : (admin ? 'सुधारित करा' : 'जोडा')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminModal;