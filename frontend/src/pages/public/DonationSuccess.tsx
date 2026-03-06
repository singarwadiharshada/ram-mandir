import React from 'react';
import './DonationSuccess.css';

const DonationSuccess: React.FC = () => {
  return (
    <div className="success-container">
      <div className="overlay"></div>
      <div className="success-card">
        <div className="success-icon">✅</div>
        <h1>देणगी यशस्वी!</h1>
        <p>आपली देणगी यशस्वीरित्या नोंदवली गेली.</p>
        
        {/* Add the square image here */}
        <div className="qr-image-container">
          <img 
            src="/images/QR code.jpeg"
            alt="Shivkumar Chavan UPI QR Code" 
            className="qr-square-image"
          />
          <p className="qr-upi-id">UPI ID: shivkumarchavan.sc@oksbi</p>
          <p className="qr-instruction">Scan to pay with any UPI app</p>
        </div>
        
        <p>कृपया देणगी नोंद करून आपण केलेले पेमेंट स्क्रीनशॉट 9503959906 या नंबर वर व्हॉट्सॲप वर पाठवणे ही विनंती.</p>
        
        <div className="success-details">
          <p>श्री रामाचा आशीर्वाद आपल्यावर सदैव राहो. 🙏</p>
        </div>

        <a href="/" className="home-btn">
          मुख्यपृष्ठावर जा
        </a>
      </div>
    </div>
  );
};

export default DonationSuccess;