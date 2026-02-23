import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { PrasadItem, ServiceCategory } from '../../types';
import Toast from '../../components/Toast';
import './DonationForm.css';

const DonationForm: React.FC = () => {
  const [formData, setFormData] = useState({
    donorName: '',
    mobile: '',
    service: 'महाप्रसाद' as ServiceCategory,
    item: '',
    quantity: 1,
    amount: '',
    address: ''
  });

  const [selectedItem, setSelectedItem] = useState<PrasadItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

  // Fetch available items
  const { data: items = [], isLoading } = useQuery<PrasadItem[]>({
    queryKey: ['public-items', formData.service, searchTerm],
    queryFn: () => api.getPublicItems({ category: formData.service, search: searchTerm })
  });

  // Create donation mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.createPublicDonation({
      ...data,
      amount: parseInt(data.amount) || 0
    }),
    onSuccess: () => {
      showToast('देणगी यशस्वीरित्या नोंदवली गेली! जय श्री राम! 🙏', 'success');
      // Reset form
      setFormData({
        donorName: '',
        mobile: '',
        service: 'महाप्रसाद',
        item: '',
        quantity: 1,
        amount: '',
        address: ''
      });
      setSelectedItem(null);
      
      // Redirect to success page after 2 seconds
      setTimeout(() => {
        window.location.href = '/donation-success';
      }, 2000);
    },
    onError: (error: any) => {
      showToast(error.error || 'काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.', 'error');
    }
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleItemSelect = (item: PrasadItem) => {
    setSelectedItem(item);
    setFormData({ ...formData, item: item._id });
  };

  const handleQuantityChange = (quantity: number) => {
    if (selectedItem) {
      const maxAvailable = selectedItem.required - selectedItem.received;
      const validQuantity = Math.min(Math.max(quantity, 0.5), maxAvailable);
      setFormData({ ...formData, quantity: validQuantity });
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

  return (
    <div className="donation-form-container">
      {/* Temple Header */}
      <div className="temple-header">
        <div className="header-content">
          <h1>श्री राम मंदिर, शाहूपुरी, कोल्हापूर</h1>
          <h2>श्री राम जन्मोत्सव २०२६</h2>
          <p className="temple-dates">१९ मार्च २०२६ ते २६ मार्च २०२६</p>
          <p className="temple-address">श्री राम मंदिर, शाहूपुरी ४ थी गल्ली, कोल्हापूर</p>
        </div>
      </div>

      {/* Main Form */}
      <div className="form-wrapper">
        <h3>महाप्रसाद देणगी नोंदणी फॉर्म</h3>
        <p className="form-subtitle">कृपया खालील माहिती भरा</p>

        <form onSubmit={handleSubmit} className="donation-form">
          <div className="form-group">
            <label>सेवा निवडा *</label>
            <select
              value={formData.service}
              onChange={(e) => {
                setFormData({ ...formData, service: e.target.value as ServiceCategory, item: '' });
                setSelectedItem(null);
              }}
              required
            >
              <option value="महाप्रसाद">महाप्रसाद</option>
              <option value="अभिषेक">अभिषेक</option>
              <option value="इतर">इतर</option>
            </select>
          </div>

          <div className="form-group">
            <label>देणगीदाराचे नाव *</label>
            <input
              type="text"
              value={formData.donorName}
              onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
              placeholder="पूर्ण नाव"
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
              required
            />
          </div>

          <div className="form-group">
            <label>पत्ता</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="शाहूपुरी, कोल्हापूर"
              rows={2}
            />
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
              <div className="loading">लोड करत आहे...</div>
            ) : (
              <div className="items-grid">
                {items.length === 0 ? (
                  <div className="no-items">सध्या कोणतीही वस्तू उपलब्ध नाही</div>
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
                        <div className="item-detail">बाकी: {remaining.toFixed(3)} {item.unit}</div>
                        {!available && (
                          <div className="fulfilled-badge">पूर्ण</div>
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
                  <strong>निवडलेली वस्तू:</strong> {selectedItem.name}
                  <small>(बाकी: {getRemaining(selectedItem)} {selectedItem.unit})</small>
                </div>
                <button type="button" onClick={() => setSelectedItem(null)} className="change-btn">
                  बदला
                </button>
              </div>

              <div className="form-group">
                <label>प्रमाण ({selectedItem.unit}) *</label>
                <div className="quantity-input">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(formData.quantity - 0.5)}
                    disabled={formData.quantity <= 0.5}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max={selectedItem.required - selectedItem.received}
                    value={formData.quantity}
                    onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0.5)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(formData.quantity + 0.5)}
                    disabled={formData.quantity >= (selectedItem.required - selectedItem.received)}
                  >
                    +
                  </button>
                </div>
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
              required
            />
            <small className="amount-hint">(रु.१०० ते रु.१००० दरम्यान रक्कम असावी)</small>
          </div>

          <button type="submit" className="submit-btn" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'नोंदवत आहे...' : 'जय श्री राम 🔥'}
          </button>
        </form>

        {/* Admin Login Link */}
        <div className="admin-login-link">
          <a href="/login">प्रशासक लॉगिन</a>
        </div>
      </div>

      {/* Footer */}
      <footer className="public-footer">
        <p>श्री राम मंदिर, शाहूपुरी ४ थी गल्ली, कोल्हापूर | स्थापना - १९२२</p>
        <p>📞 8956747400, 9552297302, 9503959906, 8830149595</p>
      </footer>

      {toast.show && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

export default DonationForm;