import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { PrasadItem, ServiceCategory, UnitType } from '../types';
import './ItemModal.css';

interface ItemModalProps {
  item: PrasadItem | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

interface FormData {
  name: string;
  category: ServiceCategory;
  unit: UnitType;
  required: string;
}

const ItemModal: React.FC<ItemModalProps> = ({ item, onClose, onSuccess, showToast }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: 'महाप्रसाद',
    unit: 'kg',
    required: ''
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        category: item.category,
        unit: item.unit,
        required: item.required.toString()
      });
    }
  }, [item]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      // Log the data being sent
      console.log('Sending item data:', {
        name: data.name,
        category: data.category,
        unit: data.unit,
        required: parseFloat(data.required)
      });
      
      return api.createItem({
        name: data.name,
        category: data.category,
        unit: data.unit,
        required: parseFloat(data.required)
      });
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      console.error('Error creating item:', error);
      showToast(error.error || 'काहीतरी चूक झाली', 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => api.updateItem(item!._id, {
      name: data.name,
      category: data.category,
      unit: data.unit,
      required: parseFloat(data.required)
    }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      console.error('Error updating item:', error);
      showToast(error.error || 'काहीतरी चूक झाली', 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.required) {
      showToast('कृपया सर्व आवश्यक माहिती भरा', 'error');
      return;
    }

    const requiredNum = parseFloat(formData.required);
    if (isNaN(requiredNum) || requiredNum <= 0) {
      showToast('आवश्यक प्रमाण योग्य संख्या असावी', 'error');
      return;
    }

    if (item) {
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
          <h3>{item ? 'वस्तू संपादित करा' : 'नवीन वस्तू जोडा'}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>वस्तूचे नाव *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="उदा. तांदळ"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label>श्रेणी *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ServiceCategory })}
              disabled={isLoading}
              required
            >
              <option value="महाप्रसाद">महाप्रसाद</option>
              <option value="अभिषेक">अभिषेक</option>
              <option value="इतर">इतर</option>
            </select>
          </div>

          <div className="form-group">
            <label>एकक *</label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value as UnitType })}
              disabled={isLoading}
              required
            >
              <option value="kg">किलो (kg)</option>
              <option value="gram">ग्रॅम (gram)</option>
              <option value="piece">नग (piece)</option>
              <option value="liter">लिटर (liter)</option>
            </select>
          </div>

          <div className="form-group">
            <label>आवश्यक प्रमाण *</label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={formData.required}
              onChange={(e) => setFormData({ ...formData, required: e.target.value })}
              placeholder="उदा. 10.000"
              disabled={isLoading}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>
              रद्द करा
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'जतन करत आहे...' : (item ? 'सुधारित करा' : 'जोडा')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemModal;