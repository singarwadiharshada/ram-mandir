import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import './DashboardLayout.css';

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('donations')) return 'donations';
    if (path.includes('items')) return 'items';
    if (path.includes('services')) return 'services';
    if (path.includes('admin')) return 'admin';
    return 'donations';
  };

  const activeTab = getActiveTab();

  return (
    <div className="dashboard-container">
      {/* Header with Theme Colors */}
      <div className="temple-header">
        <div className="header-content">
          <h1 className="temple-name">श्री राम मंदिर, शाहूपुरी, कोल्हापूर</h1>
          {/* <h2 className="festival-name">श्री राम जन्मोत्सव २०२६</h2> */}
        </div>
        
        {/* User Info positioned at top right */}
        <div className="user-info">
          <span className="user-name">
            <span className="user-icon">👤</span>
            {user.username || 'Admin'}
          </span>
          <button onClick={handleLogout} className="logout-btn">
            <span className="logout-icon">🚪</span>
            <span className="logout-text">बाहेर पडा</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button 
          className={`nav-tab ${activeTab === 'donations' ? 'active' : ''}`}
          onClick={() => navigate('/admin/donations')}
        >
          <span className="tab-icon">🙏</span>
          <span>देणग्या</span>
        </button>
        <button 
          className={`nav-tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => navigate('/admin/items')}
        >
          <span className="tab-icon">📦</span>
          <span>प्रसाद वस्तू</span>
        </button>
        <button 
          className={`nav-tab ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => navigate('/admin/services')}
        >
          <span className="tab-icon">✨</span>
          <span>सेवा पर्याय</span>
        </button>
        <button 
          className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={() => navigate('/admin/admins')}
        >
          <span className="tab-icon">⚙️</span>
          <span>प्रशासक</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="content-area">
        <Outlet />
      </div>

      {/* Footer */}
      <div className="footer">
        <p className="footer-text">🏯 श्री राम मंदिर, शाहूपुरी, कोल्हापूर | स्थापना - १९२२</p>
        <p className="copyright">© २०२६ सर्व हक्क राखीव</p>
      </div>
    </div>
  );
};

export default DashboardLayout;