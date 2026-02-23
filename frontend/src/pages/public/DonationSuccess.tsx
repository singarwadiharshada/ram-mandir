import React from 'react';
import './DonationSuccess.css';

const DonationSuccess: React.FC = () => {
  return (
    <div className="success-container">
      <div className="success-card">
        <div className="success-icon">✅</div>
        <h1>देणगी यशस्वी!</h1>
        <p>आपली देणगी यशस्वीरित्या नोंदवली गेली.</p>
        <p>श्री रामाचा आशीर्वाद आपल्यावर सदैव राहो. 🙏</p>
        
        <div className="success-details">
          <p>तुम्हाला लवकरच संदेश प्राप्त होईल.</p>
        </div>

        <a href="/" className="home-btn">
          मुख्यपृष्ठावर जा
        </a>
      </div>
    </div>
  );
};

export default DonationSuccess;