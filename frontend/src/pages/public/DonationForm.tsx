import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { PrasadItem, ServiceCategory } from '../../types';
import Toast from '../../components/Toast';
import './DonationForm.css';

// Add this interface for the paginated response
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

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
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  
  // Audio ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/sounds/success.mp3');
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Fetch items for dropdown when service is महाप्रसाद
  const { data: itemsData, isLoading, error } = useQuery<PrasadItem[], Error>({
    queryKey: ['items', formData.service, currentPage, itemsPerPage],
    queryFn: async () => {
      console.log('Fetching items for dropdown:', formData.service);
      
      try {
        const response = await api.getPublicItems({ 
          category: formData.service, 
          search: '',
          page: currentPage,
          limit: itemsPerPage
        });
        
        console.log('API Response received:', response);
        
        // Handle both array and object response
        let itemsArray: PrasadItem[] = [];
        let totalCount = 0;
        
        if (Array.isArray(response)) {
          itemsArray = response;
          totalCount = response.length;
          console.log(`Found ${itemsArray.length} items (array response)`);
        } else if (response && typeof response === 'object') {
          // Properly type the response as PaginatedResponse
          const paginatedResponse = response as PaginatedResponse<PrasadItem>;
          itemsArray = paginatedResponse.items || [];
          totalCount = paginatedResponse.total || itemsArray.length;
          console.log(`Found ${itemsArray.length} items (object response). Total: ${totalCount}`);
        }
        
        // Create a new array with the totalCount property
        const result = [...itemsArray];
        (result as any).totalCount = totalCount;
        
        return result;
      } catch (error) {
        console.error('Error fetching items:', error);
        throw error;
      }
    },
    enabled: formData.service === 'महाप्रसाद' // Only fetch for mahaprasad
  });

  const items = itemsData || [];
  const totalItems = (itemsData as any)?.totalCount || items.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Function to play success audio
  const playSuccessAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.log('Audio playback failed:', error);
      });
    }
  };

  // Create donation mutation with improved error handling
// Create donation mutation with improved error handling
const createMutation = useMutation({
  mutationFn: (data: typeof formData) => {
    console.log('Submitting donation with data:', JSON.stringify(data, null, 2));
    
    // Find the selected item to get its details
    const selectedItemObj = items.find(i => i._id === data.item);
    
    // Base object with required fields for all services
    const donationData: any = {
      donorName: data.donorName,
      mobile: data.mobile,
      service: data.service,
      address: data.address || '',
    };
    
    // Add service-specific fields based on the updated schema
    if (data.service === 'महाप्रसाद') {
      // For Mahaprasad: send item, quantity, unit, but NO amount
      donationData.item = data.item;
      donationData.itemName = selectedItemObj?.name || '';
      donationData.quantity = data.quantity;
      donationData.unit = selectedItemObj?.unit || 'kg';
      
      // IMPORTANT: Explicitly remove amount field if it exists
      delete donationData.amount;
    } else {
      // For Abhishek/Other: send amount, but NO item/quantity/unit
      donationData.amount = parseInt(data.amount) || 0;
      
      // IMPORTANT: Explicitly remove item-related fields if they exist
      delete donationData.item;
      delete donationData.itemName;
      delete donationData.quantity;
      delete donationData.unit;
    }
    
    console.log('Processed donation data being sent:', JSON.stringify(donationData, null, 2));
    
    // Validation check
    if (data.service === 'महाप्रसाद') {
      console.log('Checking Mahaprasad donation - amount should be undefined:', donationData.amount);
    } else {
      console.log('Checking Abhishek/Other donation - amount should be number:', donationData.amount);
    }
    
    return api.createPublicDonation(donationData);
  },
  onSuccess: (response) => {
    console.log('Donation successful:', response);
    playSuccessAudio();
    
    showToast('देणगी यशस्वीरित्या नोंदवली गेली! जय श्री राम! 🙏', 'success');
    
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
    setCurrentPage(1);
    
    setTimeout(() => {
      window.location.href = '/donation-success';
    }, 2000);
  },
  onError: (error: any) => {
    console.error('Full error object:', error);
    console.error('Error response data:', error.response?.data);
    
    let errorMessage = 'काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.';
    
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.code === 'ERR_NETWORK') {
      errorMessage = 'सर्व्हरशी संपर्क साधता आला नाही. कृपया नेटवर्क तपासा.';
    }
    
    showToast(errorMessage, 'error');
  }
});

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const item = items.find(i => i._id === selectedId);
    setSelectedItem(item || null);
    setFormData({ ...formData, item: selectedId });
  };

  const handleQuantityChange = (quantity: number) => {
    if (selectedItem) {
      const maxAvailable = selectedItem.required - selectedItem.received;
      const validQuantity = Math.min(Math.max(quantity, 0.5), maxAvailable);
      console.log('Quantity changed to:', validQuantity);
      setFormData({ ...formData, quantity: validQuantity });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Basic validation
      if (!formData.donorName?.trim()) {
        showToast('कृपया देणगीदाराचे नाव भरा', 'error');
        return;
      }

      if (!formData.mobile?.trim()) {
        showToast('कृपया मोबाईल नंबर भरा', 'error');
        return;
      }

      if (!/^\d{10}$/.test(formData.mobile)) {
        showToast('मोबाईल नंबर १० अंकी असावा', 'error');
        return;
      }

      // Service-specific validation
      if (formData.service === 'महाप्रसाद') {
        if (!formData.item) {
          showToast('कृपया वस्तू निवडा', 'error');
          return;
        }
        
        if (!selectedItem) {
          showToast('कृपया वैध वस्तू निवडा', 'error');
          return;
        }

        // Validate quantity doesn't exceed available
        const maxAvailable = selectedItem.required - selectedItem.received;
        if (formData.quantity > maxAvailable) {
          showToast(`कृपया ${maxAvailable} ${selectedItem.unit} पेक्षा कमी प्रमाण निवडा`, 'error');
          return;
        }
      } else {
        // Abhishek/Other validation
        if (!formData.amount || parseInt(formData.amount) < 1) {
          showToast('कृपया वैध देणगी रक्कम भरा', 'error');
          return;
        }

        // Amount range validation
        const amount = parseInt(formData.amount);
        if (amount < 100 || amount > 1000) {
          showToast('कृपया रु.१०० ते रु.१००० दरम्यान रक्कम भरा', 'error');
          return;
        }
      }

      console.log('Form validation passed, submitting:', formData);
      createMutation.mutate(formData);
      
    } catch (error) {
      console.error('Form submission error:', error);
      showToast('फॉर्म सबमिट करताना त्रुटी आली', 'error');
    }
  };

  const getRemaining = (item: PrasadItem) => {
    return (item.required - item.received).toFixed(3);
  };

  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <div className="donation-form-container">
      {/* Temple Header with Login on Right */}
      <div className="temple-header">
        <div className="header-content">
          <h1 className="main-title">श्री राम मंदिर, शाहूपुरी, कोल्हापूर</h1>
          <h2 className="festival-title">श्री राम जन्मोत्सव २०२६</h2>
          <h3>१९ मार्च २०२६ ते २६ मार्च २०२६</h3>
          <h4>श्री राम मंदिर, शाहूपुरी ४ थी गल्ली, कोल्हापूर</h4>
        </div>
        
        {/* Login Button on Right Side */}
        <div className="header-login">
          <a href="/login" className="login-btn">
            <span className="login-icon">👤</span>
          </a>
        </div>
      </div>

      {/* Main Form */}
      <div className="form-wrapper">
        <h3>देणगी नोंदणी फॉर्म</h3>
        <p className="form-subtitle">कृपया खालील माहिती भरा</p>

        <form onSubmit={handleSubmit} className="donation-form">
          <div className="form-group">
            <label>सेवा निवडा *</label>
            <select
              value={formData.service}
              onChange={(e) => {
                console.log('Service changed to:', e.target.value);
                setFormData({ 
                  ...formData, 
                  service: e.target.value as ServiceCategory, 
                  item: '',
                  amount: '' // Clear amount when switching services
                });
                setSelectedItem(null);
                setCurrentPage(1);
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

          {/* For Mahaprasad - Show Item Selection Dropdown */}
          {formData.service === 'महाप्रसाद' && (
            <div className="form-group">
              <label>प्रसाद वस्तू निवडा *</label>
              {isLoading ? (
                <div className="loading">लोड करत आहे...</div>
              ) : error ? (
                <div className="error-message">डेटा लोड करताना त्रुटी आली</div>
              ) : (
                <>
                  <select
                    value={formData.item}
                    onChange={handleItemSelect}
                    required
                    className="service-select"
                  >
                    <option value="">-- वस्तू निवडा --</option>
                    {items.map((item) => {
                      const remaining = parseFloat(getRemaining(item));
                      const available = remaining > 0;
                      return (
                        <option 
                          key={item._id} 
                          value={item._id}
                          disabled={!available}
                        >
                          {item.name} {!available ? '(पूर्ण)' : `(बाकी: ${remaining} ${item.unit})`}
                        </option>
                      );
                    })}
                  </select>

                  {/* Pagination for items */}
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button
                        type="button"
                        onClick={goToPrevPage}
                        disabled={currentPage === 1}
                        className="pagination-btn"
                      >
                        ← मागील
                      </button>
                      <span className="page-info">
                        पृष्ठ {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="pagination-btn"
                      >
                        पुढील →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Show selected item and quantity for Mahaprasad */}
          {formData.service === 'महाप्रसाद' && selectedItem && (
            <>
              <div className="selected-item-info">
                <div>
                  <strong>निवडलेली वस्तू:</strong> {selectedItem.name}
                  <small>(बाकी: {getRemaining(selectedItem)} {selectedItem.unit})</small>
                </div>
                <button type="button" onClick={() => {
                  setSelectedItem(null);
                  setFormData({ ...formData, item: '' });
                }} className="change-btn">
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

          {/* For Abhishek and Other - Show Amount Field */}
          {formData.service !== 'महाप्रसाद' && (
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
          )}

          <button 
            type="submit" 
            className="submit-btn" 
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'नोंदवत आहे...' : 'जय श्री राम 🔥'}
          </button>
        </form>
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