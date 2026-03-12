import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { PrasadItem, ServiceCategory, Service } from '../../types';
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

// Unit configuration helper
const getUnitConfig = (unit: string) => {
  switch (unit) {
    case 'gram':
      return { 
        step: 50, 
        min: 50, 
        displayStep: 50,
        formatValue: (val: number) => Math.round(val),
        validateStep: (val: number) => Math.round(val / 50) * 50
      };
    case 'kg':
      return { 
        step: 0.5, 
        min: 0.5, 
        displayStep: 0.5,
        formatValue: (val: number) => Number(val.toFixed(3)),
        validateStep: (val: number) => Math.round(val / 0.5) * 0.5
      };
    case 'liter':
      return { 
        step: 0.5, 
        min: 0.5, 
        displayStep: 0.5,
        formatValue: (val: number) => Number(val.toFixed(3)),
        validateStep: (val: number) => Math.round(val / 0.5) * 0.5
      };
    case 'piece':
      return { 
        step: 1, 
        min: 1, 
        displayStep: 1,
        formatValue: (val: number) => Math.floor(val),
        validateStep: (val: number) => Math.floor(val)
      };
    default:
      return { 
        step: 0.5, 
        min: 0.5, 
        displayStep: 0.5,
        formatValue: (val: number) => Number(val.toFixed(3)),
        validateStep: (val: number) => val
      };
  }
};

const DonationForm: React.FC = () => {
  const [formData, setFormData] = useState({
    donorName: '',
    mobile: '',
    service: 'महाप्रसाद' as ServiceCategory,
    sevaId: '', // Store the selected service _id for "इतर" category
    item: '',
    quantity: 1,
    amount: '',
    address: ''
  });

  const [selectedItem, setSelectedItem] = useState<PrasadItem | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null); // For storing the selected service details
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  
  // Audio ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/sounds/jai-shree-ram.mp3');
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Fetch services for dropdown when "इतर" is selected - USING EXISTING getServices METHOD
  const { data: servicesData, isLoading: servicesLoading, error: servicesError } = useQuery<Service[], Error>({
    queryKey: ['services', 'इतर'],
    queryFn: async () => {
      console.log('Fetching services for इतर category');
      
      try {
        // Use the existing getServices method with category filter
        const response = await api.getServices({ 
          category: 'इतर',
          page: 1,
          limit: 100 // Get all active services
        });
        
        console.log('Services API Response:', response);
        
        // Handle both array and paginated response
        let servicesArray: Service[] = [];
        
        if (Array.isArray(response)) {
          servicesArray = response;
        } else if (response && typeof response === 'object' && 'items' in response) {
          servicesArray = (response as any).items || [];
        }
        
        // Filter only active services
        const activeServices = servicesArray.filter((service: Service) => service.isActive);
        
        console.log(`Found ${activeServices.length} active services`);
        return activeServices;
      } catch (error) {
        console.error('Error fetching services:', error);
        throw error;
      }
    },
    enabled: formData.service === 'इतर' // Only fetch for "इतर" category
  });

  // Fetch items for dropdown when service is महाप्रसाद
  const { data: itemsData, isLoading: itemsLoading, error: itemsError } = useQuery<PrasadItem[], Error>({
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
        
        console.log('Items API Response received:', response);
        
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

  const services = servicesData || [];

  // Function to play success audio
  const playSuccessAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.log('Audio playback failed:', error);
      });
    }
  };

  // Function to download invitation image
  const downloadInvitation = () => {
    // Create a link element
    const link = document.createElement('a');
    
    // Path to your invitation image in the public folder
    link.href = '/images/Invitationcard.jpeg';
    
    // Set the download attribute with filename
    link.download = 'shri-ram-janmotsav-invitation.jpeg';
    
    // Append to body, click and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success toast
    showToast('निमंत्रण पत्रिका डाउनलोड होत आहे...', 'success');
  };

  // Validation function
  const validateFormData = (data: typeof formData, selectedItem: PrasadItem | null, selectedService: Service | null): string | null => {
    if (!data.donorName?.trim()) return 'देणगीदाराचे नाव आवश्यक आहे';
    if (!data.mobile?.trim()) return 'मोबाईल नंबर आवश्यक आहे';
    if (!/^\d{10}$/.test(data.mobile)) return 'मोबाईल नंबर १० अंकी असावा';
    
    if (data.service === 'महाप्रसाद') {
      if (!data.item) return 'कृपया वस्तू निवडा';
      if (!selectedItem) return 'कृपया वैध वस्तू निवडा';
      if (!data.quantity || data.quantity <= 0) return 'कृपया वैध प्रमाण भरा';
      
      const maxAvailable = selectedItem.required - selectedItem.received;
      if (data.quantity > maxAvailable) {
        return `कृपया ${maxAvailable} ${selectedItem.unit} पेक्षा कमी प्रमाण निवडा`;
      }
    } else if (data.service === 'इतर') {
      // For "इतर" category, validate selected service
      if (!data.sevaId) return 'कृपया सेवा निवडा';
      if (!selectedService) return 'कृपया वैध सेवा निवडा';
      
      const amount = Number(data.amount);
      if (!amount || amount < selectedService.minAmount) {
        return `कृपया किमान ₹${selectedService.minAmount} रक्कम भरा`;
      }
      if (selectedService.maxAmount && amount > selectedService.maxAmount) {
        return `कृपया कमाल ₹${selectedService.maxAmount} रक्कम भरा`;
      }
    } else {
      // For अभिषेक
      if (!data.amount || Number(data.amount) < 100) {
        return 'कृपया किमान ₹१०० रक्कम भरा';
      }
      if (Number(data.amount) > 1000) {
        return 'कृपया कमाल ₹१००० रक्कम भरा';
      }
    }
    
    return null; // No validation errors
  };

  // Create donation mutation with improved error handling
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      console.log('Submitting donation with data:', JSON.stringify(data, null, 2));
      
      // Create a clean data object that matches what the API expects
      const donationData: any = {
        donorName: data.donorName.trim(),
        mobile: data.mobile.trim(),
        service: data.service,
        address: data.address.trim() || '',  // Address is allowed
      };
      
      // Add service-specific fields based on the service type
      if (data.service === 'महाप्रसाद') {
        // For Mahaprasad: send item, quantity
        donationData.item = data.item;
        donationData.quantity = Number(data.quantity); // Ensure it's a number
        
        console.log('Mahaprasad donation data:', {
          donorName: donationData.donorName,
          mobile: donationData.mobile,
          service: donationData.service,
          address: donationData.address,
          item: donationData.item,
          quantity: donationData.quantity
        });
        
      } else if (data.service === 'इतर') {
        // For "इतर" category: send serviceId and amount
        donationData.serviceId = data.sevaId; // Send the selected service _id
        donationData.amount = Number(data.amount) || 0;
        
        console.log('Other category donation data:', {
          donorName: donationData.donorName,
          mobile: donationData.mobile,
          service: donationData.service,
          serviceId: donationData.serviceId,
          address: donationData.address,
          amount: donationData.amount
        });
        
      } else {
        // For Abhishek: send amount only
        donationData.amount = Number(data.amount) || 0;
        
        console.log('Abhishek donation data:', {
          donorName: donationData.donorName,
          mobile: donationData.mobile,
          service: donationData.service,
          address: donationData.address,
          amount: donationData.amount
        });
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
        sevaId: '',
        item: '',
        quantity: 1,
        amount: '',
        address: ''
      });
      setSelectedItem(null);
      setSelectedService(null);
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
    
    // Set initial quantity based on unit
    if (item) {
      const config = getUnitConfig(item.unit);
      setFormData({ ...formData, item: selectedId, quantity: config.min });
    } else {
      setFormData({ ...formData, item: selectedId });
    }
  };

  const handleServiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const service = services.find(s => s._id === selectedId);
    setSelectedService(service || null);
    
    setFormData({ 
      ...formData, 
      sevaId: selectedId,
      amount: service?.minAmount?.toString() || '' // Set default amount to minAmount
    });
  };

  const handleQuantityChange = (quantity: number) => {
    if (selectedItem) {
      const config = getUnitConfig(selectedItem.unit);
      const maxAvailable = selectedItem.required - selectedItem.received;
      
      // Round to nearest valid step
      let validQuantity = config.validateStep(quantity);
      
      // Ensure within bounds
      validQuantity = Math.max(config.min, validQuantity);
      validQuantity = Math.min(validQuantity, maxAvailable);
      
      // Format based on unit
      validQuantity = config.formatValue(validQuantity);
      
      console.log('Quantity changed to:', validQuantity, selectedItem.unit);
      setFormData({ ...formData, quantity: validQuantity });
    }
  };

  const handleAmountChange = (amount: string) => {
    setFormData({ ...formData, amount });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submitting
    const validationError = validateFormData(formData, selectedItem, selectedService);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    console.log('Form validation passed, submitting:', formData);
    createMutation.mutate(formData);
  };

  const getRemaining = (item: PrasadItem) => {
    return (item.required - item.received).toFixed(3);
  };

  // Get unit display name in Marathi
  const getUnitDisplay = (unit: string) => {
    switch (unit) {
      case 'kg': return 'किलो';
      case 'gram': return 'ग्रॅम';
      case 'liter': return 'लिटर';
      case 'piece': return 'नग';
      default: return unit;
    }
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
    <div className="donation-form-container with-bg-image">
      {/* Temple Header with Logo on Left, Invitation Button and Login on Right */}
      <div className="temple-header">
        <div className="header-logo">
          <img 
            src="favicon.ico" 
            alt="श्री राम मंदिर लोगो" 
            className="temple-logo"
          />
        </div>
        
        <div className="header-content">
          <h1 className="main-title">श्री राम मंदिर, शाहूपुरी, कोल्हापूर</h1>
          <h2 className="festival-title">श्री राम जन्मोत्सव २०२६</h2>
        </div>
        
        {/* Invitation Download Button and Login */}
        <div className="header-actions">
          <button 
            className="invitation-download-btn"
            onClick={downloadInvitation}
            title="आमंत्रण पत्रिका डाउनलोड करा"
          >
            <span className="invitation-icon">📥</span>
            <span className="invitation-text">निमंत्रण पत्रिका</span>
          </button>
          
          <a href="/login" className="login-btn">
            <span className="login-icon">लॉग इन</span>
          </a>
        </div>
      </div>

      {/* Temple Information Container */}
      <div className="temple-info-container">
        <div className="temple-info-text">
          <div>स्थापना - 1922. रजि न A-9</div>
          <div>श्री राम मंदिर, शाहुपुरी 4 थी गल्ली, कोल्हापूर</div>
          <div>श्री राम जन्मोत्सव व महाप्रसाद</div>
          <div>19 मार्च 2026 ते 26 मार्च 2026</div>
          <div>संपर्क - 8956747400, 9552297302, 9503959906, 8830149595</div>
        </div>
      </div>

      {/* Main Form */}
      <div className="form-wrapper">
        <h3>महाप्रसाद 26 मार्च 2026 वेळ दु.12.00 ते 3.00</h3>
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
                  sevaId: '', // Reset sevaId when service changes
                  item: '',
                  amount: '' // Clear amount when switching services
                });
                setSelectedItem(null);
                setSelectedService(null);
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
              <label>वस्तू निवडा *</label>
              {itemsLoading ? (
                <div className="loading">लोड करत आहे...</div>
              ) : itemsError ? (
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
                          {item.name} - {getUnitDisplay(item.unit)} 
                          {!available ? ' (पूर्ण)' : ` (बाकी: ${remaining} ${item.unit})`}
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
                  <span className="unit-badge">{getUnitDisplay(selectedItem.unit)}</span>
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
                <label>प्रमाण ({getUnitDisplay(selectedItem.unit)}) *</label>
                {(() => {
                  const config = getUnitConfig(selectedItem.unit);
                  const maxAvailable = selectedItem.required - selectedItem.received;
                  
                  return (
                    <div className="quantity-input">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(formData.quantity - config.step)}
                        disabled={formData.quantity <= config.min}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step={config.step}
                        min={config.min}
                        max={maxAvailable}
                        value={formData.quantity}
                        onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || config.min)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(formData.quantity + config.step)}
                        disabled={formData.quantity >= maxAvailable}
                      >
                        +
                      </button>
                    </div>
                  );
                })()}
                <small className="quantity-hint">
                  किमान प्रमाण: {getUnitConfig(selectedItem.unit).min} {selectedItem.unit}
                  {selectedItem.unit === 'gram' && ' (५० ग्रॅमच्या पटीत)'}
                  {selectedItem.unit === 'kg' && ' (०.५ किलोच्या पटीत)'}
                  {selectedItem.unit === 'piece' && ' (१ नगच्या पटीत)'}
                </small>
              </div>
            </>
          )}

          {/* For Abhishek - Show Amount Field Only */}
          {formData.service === 'अभिषेक' && (
            <div className="form-group">
              <label>देणगी रक्कम (₹) *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="उदा. 500"
                min="100"
                max="1000"
                required
              />
              <small className="amount-hint">(₹५00 ते ₹१000 दरम्यान रक्कम असावी.)</small>
            </div>
          )}

          {/* For "इतर" Category - Show Seva Nivda (fetched from DB) and Amount Fields */}
          {formData.service === 'इतर' && (
            <>
              <div className="form-group">
                <label>सेवा निवडा *</label>
                {servicesLoading ? (
                  <div className="loading">सेवा लोड करत आहे...</div>
                ) : servicesError ? (
                  <div className="error-message">सेवा डेटा लोड करताना त्रुटी आली</div>
                ) : services.length === 0 ? (
                  <div className="error-message">सध्या कोणतीही सेवा उपलब्ध नाही</div>
                ) : (
                  <select
                    value={formData.sevaId}
                    onChange={handleServiceSelect}
                    required
                    className="service-select"
                  >
                    <option value="">-- सेवा निवडा --</option>
                    {services.map((service) => (
                      <option key={service._id} value={service._id}>
                        {service.name} 
                        {service.description && ` - ${service.description}`}
                        {service.maxAmount 
                          ? ` (₹${service.minAmount} - ₹${service.maxAmount})` 
                          : ` (किमान ₹${service.minAmount})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedService && (
                <div className="form-group">
                  <label>देणगी रक्कम (₹) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder={`किमान ₹${selectedService.minAmount}`}
                    min={selectedService.minAmount}
                    max={selectedService.maxAmount || undefined}
                    required
                  />
                  <small className="amount-hint">
                    {selectedService.maxAmount 
                      ? `(₹${selectedService.minAmount} ते ₹${selectedService.maxAmount} दरम्यान रक्कम असावी.)` 
                      : `(किमान ₹${selectedService.minAmount} रक्कम असावी.)`}
                  </small>
                </div>
              )}
            </>
          )}

          <button 
            type="submit" 
            className="submit-btn" 
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'नोंदवत आहे...' : 'जय श्री राम 🙏'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <footer className="public-footer">
        <p>*ऑनलाईन पेमेंटला पावती मिळणार नाही याची नोंद घ्यावी.</p>
        <p>*मंदिरात येवून रोख रक्कम देवून पावती घ्यावी.</p>
      </footer>

      {toast.show && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

export default DonationForm;