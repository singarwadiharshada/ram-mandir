import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { PrasadItem, ItemStats, ServiceCategory, UnitType } from '../types';
import ItemModal from '../components/ItemModal';
import Toast from '../components/Toast';
import { generatePrasadItemsPDF, generateSimplePrasadItemsPDF } from '../utils/prasadItemsPdfGenerator';
import './PrasadItemsPage.css';

const PrasadItemsPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PrasadItem | null>(null);
  const [showPDFOptions, setShowPDFOptions] = useState(false);
  const [filters, setFilters] = useState({ category: 'all', search: '' });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ 
    show: false, 
    message: '', 
    type: 'success' 
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Bulk upload mutation with better error handling
  const bulkUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        return await api.importItems(file);
      } catch (error: any) {
        // Log the full error for debugging
        console.error('Import error details:', error);
        
        // If we have a response data with message
        if (error.data) {
          if (error.data.message) {
            throw new Error(error.data.message);
          }
          if (error.data.error) {
            throw new Error(error.data.error);
          }
          if (typeof error.data === 'string') {
            throw new Error(error.data);
          }
        }
        
        // If 404, provide a helpful message
        if (error.status === 404) {
          throw new Error('इम्पोर्ट API उपलब्ध नाही. कृपया थेट फॉर्म वापरून वस्तू जोडा.');
        }
        
        // If 500, provide a generic message
        if (error.status === 500) {
          throw new Error('सर्व्हर त्रुटी. कृपया नंतर पुन्हा प्रयत्न करा किंवा व्यवस्थापकाशी संपर्क साधा.');
        }
        
        // Default error
        throw new Error(error.message || 'अपलोड करताना त्रुटी आली');
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['itemStats'] });
      
      if (data.failed > 0) {
        // Show errors in a more detailed way
        const errorMessage = data.errors?.length 
          ? `${data.imported} वस्तू यशस्वी, ${data.failed} वस्तू अयशस्वी\n\n${data.errors.slice(0, 3).join('\n')}${data.errors.length > 3 ? '\n...आणि इतर' : ''}`
          : `${data.imported} वस्तू यशस्वी, ${data.failed} वस्तू अयशस्वी`;
        
        showToastMessage(errorMessage, 'error');
      } else {
        showToastMessage(`${data.imported} वस्तू यशस्वीरित्या अपलोड झाल्या`, 'success');
      }
      
      setSelectedFile(null);
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      const errorMsg = error.message || 'अपलोड करताना त्रुटी आली';
      showToastMessage(errorMsg, 'error');
      setUploading(false);
    }
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type by extension
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(fileExt || '')) {
        showToastMessage('कृपया .xlsx, .xls किंवा .csv फाइल निवडा', 'error');
        event.target.value = '';
        return;
      }
      
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        showToastMessage(`फाइल खूप मोठी आहे (${(file.size / 1024 / 1024).toFixed(2)}MB). कमाल आकार 10MB आहे.`, 'error');
        event.target.value = '';
        return;
      }
      
      setSelectedFile(file);
      showToastMessage(`फाइल निवडली: ${file.name}`, 'success');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showToastMessage('कृपया फाइल निवडा', 'error');
      return;
    }

    setUploading(true);
    bulkUploadMutation.mutate(selectedFile);
  };

  // ========== PDF GENERATION FUNCTIONS ==========

  const handlePDFDownload = () => {
    if (items.length === 0) {
      showToastMessage('PDF डाउनलोड करण्यासाठी कोणतीही वस्तू नाही', 'error');
      return;
    }

    try {
      generatePrasadItemsPDF({ items, stats, filters });
      showToastMessage('PDF यशस्वीरित्या डाउनलोड होत आहे', 'success');
      setShowPDFOptions(false);
    } catch (error) {
      showToastMessage('PDF डाउनलोड करताना त्रुटी', 'error');
      console.error('PDF generation error:', error);
    }
  };

  const handleSimplePDFDownload = () => {
    if (items.length === 0) {
      showToastMessage('PDF डाउनलोड करण्यासाठी कोणतीही वस्तू नाही', 'error');
      return;
    }

    try {
      generateSimplePrasadItemsPDF(items, 'प्रसाद वस्तू यादी');
      showToastMessage('PDF यशस्वीरित्या डाउनलोड होत आहे', 'success');
      setShowPDFOptions(false);
    } catch (error) {
      showToastMessage('PDF डाउनलोड करताना त्रुटी', 'error');
      console.error('PDF generation error:', error);
    }
  };

  // Local template generation function
  const generateLocalTemplate = (format: 'xlsx' | 'csv') => {
    // Template data with gram examples
    const templateData = [
      ['वस्तूचे नाव', 'श्रेणी', 'एकक', 'आवश्यक प्रमाण'],
      ['तांदूळ', 'महाप्रसाद', 'kg', '100'],
      ['साखर', 'महाप्रसाद', 'kg', '50'],
      ['केळी', 'इतर', 'gram', '500'],
      ['दूध', 'अभिषेक', 'liter', '20'],
      ['मसाला', 'इतर', 'gram', '250'],
      ['फळे', 'इतर', 'kg', '30'],
      ['नारळ', 'इतर', 'piece', '10'],
      ['तूप', 'महाप्रसाद', 'gram', '1000']
    ];

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      
      // Add column widths
      ws['!cols'] = [
        { wch: 20 }, // वस्तूचे नाव
        { wch: 15 }, // श्रेणी
        { wch: 10 }, // एकक
        { wch: 15 }  // आवश्यक प्रमाण
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, 'prasad_items_template.xlsx');
    } else {
      // Create CSV with BOM for UTF-8
      const csvContent = templateData.map(row => row.join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'prasad_items_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
    
    showToastMessage('टेम्पलेट डाउनलोड होत आहे', 'success');
  };

  const downloadTemplate = async (format: 'xlsx' | 'csv') => {
    try {
      // Convert format to the type expected by the API (excel/csv)
      const apiFormat: 'excel' | 'csv' = format === 'xlsx' ? 'excel' : 'csv';
      
      // Try to get template from API first
      const blob = await api.getImportTemplate(apiFormat);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prasad_items_template.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showToastMessage('टेम्पलेट डाउनलोड होत आहे', 'success');
    } catch (error: any) {
      // If API fails (404 or any other error), use local template generation
      console.log('API template download failed, using local generation:', error.message);
      generateLocalTemplate(format);
    }
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

  const formatUnit = (unit: UnitType): string => {
    const unitMap: Record<UnitType, string> = {
      'kg': 'किलो',
      'gram': 'ग्रॅम',
      'liter': 'लीटर',
      'piece': 'पीस'
    };
    return unitMap[unit] || unit;
  };

  return (
    <div className="items-page">
      <div className="page-header">
        <h2>प्रसाद वस्तू व्यवस्थापन <span>प्रसाद वस्तू जोडा, संपादित करा किंवा काढा</span></h2>
        <div className="header-actions">
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
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + नवीन वस्तू जोडा
          </button>
        </div>
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
                      <td>{item.required} {formatUnit(item.unit)}</td>
                      <td>{item.received} {formatUnit(item.unit)}</td>
                      <td>{remaining} {formatUnit(item.unit)}</td>
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
                          title="संपादित करा"
                        >
                          ✎
                        </button>
                        <button 
                          className="btn-icon delete"
                          onClick={() => handleDelete(item._id)}
                          title="काढा"
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
        <h3>📤 मोठ्या प्रमाणात वस्तू अपलोड करा</h3>
        <p className="import-instructions">
          <strong>सूचना:</strong> खालील स्तंभ आवश्यक आहेत: 
          <code>वस्तूचे नाव, श्रेणी, एकक, आवश्यक प्रमाण</code>
          <br />
          <strong>श्रेणी:</strong> महाप्रसाद / mahaprasad, अभिषेक / abhishek, इतर / other
          <br />
          <strong>एकक:</strong> kg, gram, liter, piece (फक्त हीच एकके स्वीकार्य आहेत)
          <br />
          <strong>प्रमाण:</strong> दशांश मूल्ये स्वीकार्य (उदा. 5.500, 10.250, 250.500)
          <br />
          <strong>कमाल फाइल आकार:</strong> 10MB
        </p>
        
        <div className="file-upload">
          <input 
            type="file" 
            id="file" 
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            ref={fileInputRef}
            disabled={uploading}
          />
          <label htmlFor="file" className="btn-secondary">
            📂 फाइल निवडा
          </label>
          <span className="file-name">
            {selectedFile ? selectedFile.name : 'कोणतीही फाइल निवडली नाही'}
          </span>
          <button 
            className="btn-success" 
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? '⏳ अपलोड होत आहे...' : '📤 फाइल अपलोड करा'}
          </button>
        </div>

        <div className="template-links">
          <button 
            className="template-link" 
            onClick={() => downloadTemplate('xlsx')}
            disabled={uploading}
          >
            📥 Excel टेम्पलेट डाउनलोड करा (.xlsx)
          </button>
          <button 
            className="template-link" 
            onClick={() => downloadTemplate('csv')}
            disabled={uploading}
          >
            📥 CSV टेम्पलेट डाउनलोड करा (.csv)
          </button>
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