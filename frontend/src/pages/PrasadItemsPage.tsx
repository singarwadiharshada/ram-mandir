import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { PrasadItem, ItemStats } from '../types';
import ItemModal from '../components/ItemModal';
import Toast from '../components/Toast';
import './PrasadItemsPage.css';

const PrasadItemsPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PrasadItem | null>(null);
  const [filters, setFilters] = useState({ category: 'all', search: '' });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ 
    show: false, 
    message: '', 
    type: 'success' 
  });

  const queryClient = useQueryClient();

  // Fetch items
  const { data: items = [], isLoading } = useQuery<PrasadItem[]>({
    queryKey: ['items', filters],
    queryFn: () => api.getItems(filters)
  });

  // Fetch stats
  const { data: stats } = useQuery<ItemStats>({
    queryKey: ['itemStats'],
    queryFn: () => api.getItemStats()
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['itemStats'] });
      showToastMessage('वस्तू यशस्वीरित्या काढली गेली', 'success');
    },
    onError: (error: any) => {
      showToastMessage(error.error || 'काहीतरी चूक झाली', 'error');
    }
  });

  const showToastMessage = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleEdit = (item: PrasadItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('खात्री आहे? ही वस्तू काढली जाईल')) {
      deleteMutation.mutate(id);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const getRemaining = (item: PrasadItem) => {
    return item.required - item.received;
  };

  const getPercentage = (item: PrasadItem) => {
    return ((item.received / item.required) * 100).toFixed(1);
  };

  const isFulfilled = (item: PrasadItem) => {
    return item.received >= item.required;
  };

  return (
    <div className="items-page">
      <div className="page-header">
        <h2>प्रसाद वस्तू व्यवस्थापन <span>प्रसाद वस्तू जोडा, संपादित करा किंवा काढा</span></h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + नवीन वस्तू जोडा
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>एकूण वस्तू</h3>
          <div className="number">{stats?.total || 0}</div>
        </div>
        <div className="stat-card">
          <h3>पूर्ण झालेल्या</h3>
          <div className="number">{stats?.fulfilled || 0}</div>
        </div>
        <div className="stat-card">
          <h3>बाकी वस्तू</h3>
          <div className="number">{stats?.pending || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="all">सर्व श्रेणी</option>
          <option value="महाप्रसाद">महाप्रसाद</option>
          <option value="अभिषेक">अभिषेक</option>
          <option value="इतर">इतर</option>
        </select>

        <input
          type="text"
          placeholder="🔍 शोधा..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      {/* Items Table */}
      {isLoading ? (
        <div className="loading">लोड करत आहे...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>वस्तूचे नाव</th>
                <th>श्रेणी</th>
                <th>आवश्यक प्रमाण</th>
                <th>मिळालेले प्रमाण</th>
                <th>बाकी प्रमाण</th>
                <th>प्रगती</th>
                <th>स्थिती</th>
                <th>क्रिया</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-data">
                    कोणतीही वस्तू आढळली नाही
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const fulfilled = isFulfilled(item);
                  const percentage = getPercentage(item);
                  const remaining = getRemaining(item);

                  return (
                    <tr key={item._id}>
                      <td>{item.name}</td>
                      <td>
                        <span className={`badge badge-${item.category}`}>
                          {item.category}
                        </span>
                      </td>
                      <td>{item.required} {item.unit}</td>
                      <td>{item.received} {item.unit}</td>
                      <td>{remaining} {item.unit}</td>
                      <td>
                        <div className="progress-container">
                          <div className="progress-bar-bg">
                            <div 
                              className="progress-bar-fill"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: fulfilled ? '#22c55e' : '#f97316'
                              }}
                            />
                          </div>
                          <span className="progress-text">{percentage}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${fulfilled ? 'fulfilled' : 'pending'}`}>
                          {fulfilled ? '✓ पूर्ण' : '⏳ बाकी'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-icon edit"
                          onClick={() => handleEdit(item)}
                        >
                          ✎
                        </button>
                        <button 
                          className="btn-icon delete"
                          onClick={() => handleDelete(item._id)}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Import Section */}
      <div className="import-section">
        <h3>Import Instructions:</h3>
        <p>Required columns: Item Name, Category, Required Quantity (kg). Quantity must be in kg (decimal allowed, e.g., 5.500). Accepted categories: महाप्रसाद / mahaprasad, अभिषेक / abhishek, इतर / other.</p>
        
        <div className="file-upload">
          <input type="file" id="file" accept=".xlsx,.csv" />
          <label htmlFor="file" className="btn-secondary">Choose file</label>
          <span className="file-name">No file chosen</span>
          <button className="btn-success">Upload File</button>
        </div>

        <div className="template-links">
          <a href="#" className="template-link">📥 Download Excel template (.xlsx)</a>
          <a href="#" className="template-link">📥 Download CSV template (.csv)</a>
        </div>
      </div>

      {/* Item Modal */}
      {showModal && (
        <ItemModal
          item={editingItem}
          onClose={handleModalClose}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            queryClient.invalidateQueries({ queryKey: ['itemStats'] });
            showToastMessage(
              editingItem ? 'वस्तू सुधारित केली गेली' : 'वस्तू यशस्वीरित्या जोडली गेली',
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

export default PrasadItemsPage;