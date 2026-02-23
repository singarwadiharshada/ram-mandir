import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { PrasadItem, ServiceCategory } from '../types';
import './DonationModal.css';

interface DonationModalProps {
  onClose: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

interface FormData {
  donorName: string;
  mobile: string;
  service: ServiceCategory;
  item: string;
  quantity: number;
  amount: string;
  address: string;
}

const DonationModal: React.FC<DonationModalProps> = ({ onClose, onSuccess, showToast }) => {
  const [formData, setFormData] = useState<FormData>({
    donorName: '',
    mobile: '',
    service: 'महाप्रसाद',
    item: '',
    quantity: 1,
    amount: '',
    address: ''
  });

  const [selectedItem, setSelectedItem] = useState<PrasadItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch items based on selected service
  const { data: items = [], isLoading } = useQuery<PrasadItem[]>({
    queryKey: ['items', formData.service, searchTerm],
    queryFn: () => api.getItems({ category: formData.service, search: searchTerm })
  });

  // Create donation mutation
  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.createDonation({
      ...data,
      amount: parseInt(data.amount) || 0
    }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      showToast(error.error || 'काहीतरी चूक झाली', 'error');
    }
  });

  const handleItemSelect = (item: PrasadItem) => {
    setSelectedItem(item);
    setFormData({
      ...formData,
      item: item._id
    });
  };

  const handleQuantityChange = (quantity: number) => {
    if (selectedItem) {
      const maxAvailable = selectedItem.required - selectedItem.received;
      // Round to 3 decimal places to prevent floating point issues
      const validQuantity = Math.min(
        Math.max(parseFloat(quantity.toFixed(3)), 0.001), 
        maxAvailable
      );
      setFormData({
        ...formData,
        quantity: validQuantity
      });
    }
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setFormData({ ...formData, quantity: 0.001 });
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      handleQuantityChange(numValue);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.donorName || !formData.mobile || !formData.amount || !formData.item) {
      showToast('कृपया सर्व आवश्यक माहिती भरा', 'error');
      return;
    }

    if (!/^\d{10}$/.test(formData.mobile)) {
      showToast('मोबाईल नंबर १० अंकी असावा', 'error');
      return;
    }

    createMutation.mutate(formData);
  };

  const getRemaining = (item: PrasadItem) => {
    return (item.required - item.received).toFixed(3);
  };

  const isAvailable = (item: PrasadItem) => {
    return (item.required - item.received) > 0;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>नवीन देणगी नोंदवा</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>देणगीदाराचे नाव *</label>
            <input
              type="text"
              value={formData.donorName}
              onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
              placeholder="पूर्ण नाव"
              disabled={createMutation.isPending}
              required
            />
          </div>

          <div className="form-group">
            <label>मोबाईल नंबर *</label>
            <input
              type="tel"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              placeholder="१० अंकी मोबाईल नंबर"
              maxLength={10}
              disabled={createMutation.isPending}
              required
              pattern="\d{10}"
              title="कृपया १० अंकी मोबाईल नंबर टाका"
            />
          </div>

          <div className="form-group">
            <label>सेवा *</label>
            <select
              value={formData.service}
              onChange={(e) => {
                setFormData({ ...formData, service: e.target.value as ServiceCategory, item: '' });
                setSelectedItem(null);
              }}
              disabled={createMutation.isPending}
              required
            >
              <option value="महाप्रसाद">महाप्रसाद</option>
              <option value="अभिषेक">अभिषेक</option>
              <option value="इतर">इतर</option>
            </select>
          </div>

          <div className="form-group">
            <label>प्रसाद वस्तू निवडा *</label>
            <input
              type="text"
              placeholder="🔍 वस्तू शोधा..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />

            {isLoading ? (
              <div className="loading-small">लोड करत आहे...</div>
            ) : (
              <div className="items-grid">
                {items.length === 0 ? (
                  <div className="no-items">कोणतीही वस्तू उपलब्ध नाही</div>
                ) : (
                  items.map((item) => {
                    const remaining = parseFloat(getRemaining(item));
                    const available = remaining > 0;
                    const isSelected = selectedItem?._id === item._id;

                    return (
                      <div
                        key={item._id}
                        className={`item-card ${isSelected ? 'selected' : ''} ${!available ? 'fulfilled' : ''}`}
                        onClick={() => available && handleItemSelect(item)}
                      >
                        <div className="item-name">{item.name}</div>
                        <div className="item-detail">गरज: {item.required} {item.unit}</div>
                        <div className="item-detail">मिळाले: {item.received} {item.unit}</div>
                        <div className="item-detail">बाकी: {remaining.toFixed(3)} {item.unit}</div>
                        {!available && (
                          <div className="fulfilled-badge">✓ पूर्ण</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {selectedItem && (
            <>
              <div className="selected-item-info">
                <div>
                  <strong>निवडलेली वस्तू:</strong> {selectedItem.name}<br />
                  <small>
                    गरज: {selectedItem.required} {selectedItem.unit} | 
                    बाकी: {getRemaining(selectedItem)} {selectedItem.unit}
                  </small>
                </div>
                <button 
                  type="button" 
                  className="change-btn"
                  onClick={() => {
                    setSelectedItem(null);
                    setFormData({ ...formData, item: '' });
                  }}
                >
                  बदला
                </button>
              </div>

              <div className="form-group">
                <label>प्रमाण ({selectedItem.unit}) *</label>
                <div className="quantity-input">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(formData.quantity - 0.5)}
                    disabled={createMutation.isPending || formData.quantity <= 0.001}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={selectedItem.required - selectedItem.received}
                    value={formData.quantity}
                    onChange={handleQuantityInputChange}
                    disabled={createMutation.isPending}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(formData.quantity + 0.5)}
                    disabled={createMutation.isPending || formData.quantity >= (selectedItem.required - selectedItem.received)}
                  >
                    +
                  </button>
                </div>
                <small>जास्तीत जास्त: {getRemaining(selectedItem)} {selectedItem.unit}</small>
                <small className="decimal-hint">दशांश प्रमाण स्वीकारले (उदा. 1.5, 2.750, 0.250)</small>
              </div>
            </>
          )}

          <div className="form-group">
            <label>देणगी रक्कम (₹) *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="उदा. 500"
              min="1"
              disabled={createMutation.isPending}
              required
            />
          </div>

          <div className="form-group">
            <label>पत्ता</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="पूर्ण पत्ता"
              rows={3}
              disabled={createMutation.isPending}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={createMutation.isPending}>
              रद्द करा
            </button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'नोंदवत आहे...' : 'देणगी नोंदवा'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DonationModal;