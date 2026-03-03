import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Donation, DonationStats } from '../types';
import DonationModal from '../components/DonationModal';
import Toast from '../components/Toast';
import { generateDonationsPDF, generateSimpleDonationsPDF } from '../utils/html2pdfGenerator';
import './DonationsPage.css';

const DonationsPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showPDFOptions, setShowPDFOptions] = useState(false);
  const [filters, setFilters] = useState({ category: 'all', search: '' });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ 
    show: false, 
    message: '', 
    type: 'success' 
  });
  
  const queryClient = useQueryClient();

  // Fetch donations
  const { data: donations = [], isLoading } = useQuery<Donation[]>({
    queryKey: ['donations', filters],
    queryFn: () => api.getDonations(filters)
  });

  // Fetch stats
  const { data: stats } = useQuery<DonationStats>({
    queryKey: ['donationStats'],
    queryFn: () => api.getDonationStats()
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDonation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      queryClient.invalidateQueries({ queryKey: ['donationStats'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      showToastMessage('देणगी यशस्वीरित्या काढली गेली', 'success');
    },
    onError: (error: any) => {
      showToastMessage(error.error || 'काहीतरी चूक झाली', 'error');
    }
  });

  const showToastMessage = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('खात्री आहे? ही देणगी काढली जाईल')) {
      deleteMutation.mutate(id);
    }
  };

const handlePDFDownload = () => {
  if (donations.length === 0) {
    showToastMessage('PDF डाउनलोड करण्यासाठी कोणतीही देणगी नाही', 'error');
    return;
  }

  try {
    generateDonationsPDF({ donations, stats, filters });
    showToastMessage('PDF यशस्वीरित्या डाउनलोड होत आहे', 'success');
  } catch (error) {
    showToastMessage('PDF डाउनलोड करताना त्रुटी', 'error');
    console.error('PDF generation error:', error);
  }
};

const handleSimplePDFDownload = () => {
  if (donations.length === 0) {
    showToastMessage('PDF डाउनलोड करण्यासाठी कोणतीही देणगी नाही', 'error');
    return;
  }

  try {
    generateSimpleDonationsPDF(donations, 'देणगी यादी');
    showToastMessage('PDF यशस्वीरित्या डाउनलोड होत आहे', 'success');
  } catch (error) {
    showToastMessage('PDF डाउनलोड करताना त्रुटी', 'error');
    console.error('PDF generation error:', error);
  }
};

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('mr-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="donations-page">
      <div className="page-header">
        <h2>देणग्या व्यवस्थापन <span>सर्व देणग्या पहा आणि व्यवस्थापित करा</span></h2>
        <div className="pdf-dropdown">
          <button 
            className="btn-secondary" 
            onClick={() => setShowPDFOptions(!showPDFOptions)}
          >
            📄 PDF डाउनलोड करा ▼
          </button>
          {showPDFOptions && (
            <div className="pdf-dropdown-menu">
              <button onClick={handlePDFDownload}>
                संपूर्ण अहवाल (सारांश सह)
              </button>
              <button onClick={handleSimplePDFDownload}>
                फक्त यादी (सोपी)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>एकूण देणग्या</h3>
          <div className="number">{stats?.totalDonations || 0}</div>
        </div>
        <div className="stat-card">
          <h3>एकूण रक्कम</h3>
          <div className="number">₹{(stats?.totalAmount || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <h3>आजच्या देणग्या</h3>
          <div className="number">{stats?.todayDonations || 0}</div>
        </div>
        <div className="stat-card">
          <h3>सरासरी रक्कम</h3>
          <div className="number">₹{Math.round(stats?.avgAmount || 0)}</div>
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

        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + नवीन देणगी नोंदवा
        </button>
      </div>

      {/* Donations Table */}
      {isLoading ? (
        <div className="loading">लोड करत आहे...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>देणगीदाराचे नाव</th>
                <th>सेवा</th>
                <th>वस्तू</th>
                <th>प्रमाण</th>
                <th>रक्कम (₹)</th>
                <th>दिनांक</th>
                <th>मोबाईल</th>
                <th>क्रिया</th>
              </tr>
            </thead>
            <tbody>
              {donations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-data">
                    कोणतीही देणगी आढळली नाही
                  </td>
                </tr>
              ) : (
                donations.map((donation) => (
                  <tr key={donation._id}>
                    <td>{donation.donorName}</td>
                    <td>
                      <span className={`badge badge-${donation.service}`}>
                        {donation.service}
                      </span>
                    </td>
                    <td>{donation.itemName}</td>
                    <td>{donation.quantity} {donation.unit}</td>
                    <td>₹{donation.amount}</td>
                    <td>{formatDate(donation.date)}</td>
                    <td>{donation.mobile}</td>
                    <td>
                      <button 
                        className="btn-icon delete"
                        onClick={() => handleDelete(donation._id)}
                      >
                        🗑 काढा
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Donation Modal */}
      {showModal && (
        <DonationModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['donations'] });
            queryClient.invalidateQueries({ queryKey: ['donationStats'] });
            queryClient.invalidateQueries({ queryKey: ['items'] });
            showToastMessage('देणगी यशस्वीरित्या नोंदवली गेली', 'success');
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

export default DonationsPage;