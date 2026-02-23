import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Admin } from '../types';
import Toast from '../components/Toast';
import AdminModal from '../components/AdminModal';
import './AdminPage.css';

const AdminPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Fetch admins
  const { data: admins = [], isLoading } = useQuery<Admin[]>({
    queryKey: ['admins'],
    queryFn: () => api.getAdmins()
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      showToastMessage('प्रशासक यशस्वीरित्या काढला गेला', 'success');
    },
    onError: (error: any) => {
      showToastMessage(error.error || 'काहीतरी चूक झाली', 'error');
    }
  });

  const showToastMessage = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('खात्री आहे? हा प्रशासक काढला जाईल')) {
      deleteMutation.mutate(id);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingAdmin(null);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('mr-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>प्रशासक खाते व्यवस्थापन <span>प्रशासक खाती पहा आणि व्यवस्थापित करा</span></h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + नवीन प्रशासक जोडा
        </button>
      </div>

      {isLoading ? (
        <div className="loading">लोड करत आहे...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>वापरकर्ता नाव</th>
                <th>ईमेल</th>
                <th>भूमिका</th>
                <th>शेवटचे लॉगिन</th>
                <th>स्थिती</th>
                <th>क्रिया</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="no-data">
                    कोणताही प्रशासक आढळला नाही
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin._id}>
                    <td><strong>{admin.username}</strong></td>
                    <td>{admin.email}</td>
                    <td>
                      <span className={`badge badge-${admin.role === 'super_admin' ? 'super' : 'admin'}`}>
                        {admin.role === 'super_admin' ? 'मुख्य प्रशासक' : 'प्रशासक'}
                      </span>
                    </td>
                    <td>{formatDate(admin.lastLogin)}</td>
                    <td>
                      <span className={`status-badge ${admin.isActive ? 'active' : 'inactive'}`}>
                        {admin.isActive ? 'सक्रिय' : 'निष्क्रिय'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn-icon edit"
                        onClick={() => handleEdit(admin)}
                      >
                        ✎
                      </button>
                      {admin.role !== 'super_admin' && (
                        <button 
                          className="btn-icon delete"
                          onClick={() => handleDelete(admin._id)}
                        >
                          🗑
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Verification Section */}
      <div className="verification-section">
        <h1>H</h1>
        <p>Verify that it's you</p>
        <input type="text" placeholder="एंटर कोड" maxLength={6} />
        <button className="btn-primary">सत्यापित करा</button>
      </div>

{/* Admin Modal */}
{showModal && (
  <AdminModal
    admin={editingAdmin}
    onClose={handleModalClose}
    onSuccess={() => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      showToastMessage(
        editingAdmin ? 'प्रशासक सुधारित केला गेला' : 'प्रशासक यशस्वीरित्या जोडला गेला',
        'success'
      );
    }}
    showToast={showToastMessage}
    currentUser={user} // Pass the current user here
  />
)}
      {/* Toast */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} />
      )}
    </div>
  );
};

export default AdminPage;