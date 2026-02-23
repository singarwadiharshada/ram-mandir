import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { Service, ServiceCategory } from '../types';
import './ServiceModal.css';

interface ServiceModalProps {
  service: Service | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

interface FormData {
  name: string;
  category: ServiceCategory;
  minAmount: string;
  maxAmount: string;
  description: string;
}

const ServiceModal: React.FC<ServiceModalProps> = ({ service, onClose, onSuccess, showToast }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: 'महाप्रसाद',
    minAmount: '',
    maxAmount: '',
    description: ''
  });

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        category: service.category,
        minAmount: service.minAmount.toString(),
        maxAmount: service.maxAmount?.toString() || '',
        description: service.description || ''
      });
    }
  }, [service]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.createService({
      name: data.name,
      category: data.category,
      minAmount: parseInt(data.minAmount),
      maxAmount: data.maxAmount ? parseInt(data.maxAmount) : undefined,
      description: data.description,
      isActive: true
    }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      showToast(error.error || 'काहीतरी चूक झाली', 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => api.updateService(service!._id, {
      name: data.name,
      category: data.category,
      minAmount: parseInt(data.minAmount),
      maxAmount: data.maxAmount ? parseInt(data.maxAmount) : undefined,
      description: data.description
    }),
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

    if (!formData.name || !formData.minAmount) {
      showToast('कृपया सर्व आवश्यक माहिती भरा', 'error');
      return;
    }

    const minAmount = parseInt(formData.minAmount);
    
    // Fix: Compare string values instead of enum
    if (minAmount < 500 && formData.category === 'इतर') {
      showToast('किमान रक्कम रु.५०० असावी', 'error');
      return;
    }

    if (formData.maxAmount && parseInt(formData.maxAmount) <= minAmount) {
      showToast('कमाल रक्कम किमान रक्कम पेक्षा मोठी असावी', 'error');
      return;
    }

    if (service) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{service ? 'सेवा संपादित करा' : 'नवीन सेवा जोडा'}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>सेवेचे नाव *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="उदा. विशेष पूजा सेवा"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>श्रेणी *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ServiceCategory })}
              disabled={isLoading}
            >
              <option value="महाप्रसाद">महाप्रसाद</option>
              <option value="अभिषेक">अभिषेक</option>
              <option value="इतर">इतर</option>
            </select>
          </div>

          <div className="form-group">
            <label>किमान रक्कम (₹) *</label>
            <input
              type="number"
              min="1"
              value={formData.minAmount}
              onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
              placeholder="उदा. 500"
              disabled={isLoading}
            />
            {/* Fix: Compare string values */}
            {formData.category === 'इतर' && (
              <small className="warning-text">किमान रक्कम रु.५०० असावी</small>
            )}
          </div>

          <div className="form-group">
            <label>कमाल रक्कम (₹)</label>
            <input
              type="number"
              min="1"
              value={formData.maxAmount}
              onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
              placeholder="उदा. 5000"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>वर्णन</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="सेवेबद्दल माहिती"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>
              रद्द करा
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'जतन करत आहे...' : (service ? 'सुधारित करा' : 'जोडा')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceModal;