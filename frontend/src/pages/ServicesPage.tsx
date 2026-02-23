import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Service } from '../types';
import ServiceModal from '../components/ServiceModal';
import Toast from '../components/Toast';
import './ServicesPage.css';

const ServicesPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ 
    show: false, 
    message: '', 
    type: 'success' 
  });

  const queryClient = useQueryClient();

  // Fetch services
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => api.getServices()
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      showToastMessage('सेवा यशस्वीरित्या काढली गेली', 'success');
    },
    onError: (error: any) => {
      showToastMessage(error.error || 'काहीतरी चूक झाली', 'error');
    }
  });

  const showToastMessage = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('खात्री आहे? ही सेवा काढली जाईल')) {
      deleteMutation.mutate(id);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingService(null);
  };

  return (
    <div className="services-page">
      <div className="page-header">
        <h2>सेवा पर्याय व्यवस्थापन <span>इतर सेवा देणगी पर्याय जोडा किंवा काढा</span></h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + नवीन सेवा जोडा
        </button>
      </div>

      {isLoading ? (
        <div className="loading">लोड करत आहे...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>सेवेचे नाव</th>
                <th>श्रेणी</th>
                <th>किमान रक्कम (₹)</th>
                <th>कमाल रक्कम (₹)</th>
                <th>वर्णन</th>
                <th>क्रिया</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="no-data">
                    कोणतीही सेवा आढळली नाही
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service._id}>
                    <td>{service.name}</td>
                    <td>
                      <span className={`badge badge-${service.category}`}>
                        {service.category}
                      </span>
                    </td>
                    <td>₹{service.minAmount}</td>
                    <td>{service.maxAmount ? `₹${service.maxAmount}` : '-'}</td>
                    <td>{service.description || '-'}</td>
                    <td>
                      <button 
                        className="btn-icon edit"
                        onClick={() => handleEdit(service)}
                      >
                        ✎
                      </button>
                      <button 
                        className="btn-icon delete"
                        onClick={() => handleDelete(service._id)}
                      >
                        🗑
                      </button>
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
      </div>

      {/* Service Modal */}
      {showModal && (
        <ServiceModal
          service={editingService}
          onClose={handleModalClose}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
            showToastMessage(
              editingService ? 'सेवा सुधारित केली गेली' : 'सेवा यशस्वीरित्या जोडली गेली',
              'success'
            );
          }}
          showToast={showToastMessage}
        />
      )}

      {/* Toast */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} />
      )}
    </div>
  );
};

export default ServicesPage;