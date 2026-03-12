import html2pdf from 'html2pdf.js';
import { Donation, DonationStats, PrasadItem, Service } from '../types';

interface PDFGenerationParams {
  donations: Donation[];
  stats?: DonationStats;
  filters?: { category: string; search: string };
  title?: string;
}

// Helper function to get display text for item column
const getItemDisplayText = (donation: Donation): string => {
  if (donation.service === 'इतर') {
    // For "इतर" category, show the Seva name
    // Try multiple possible locations for the service name
    let serviceName = 'सेवा';
    
    if (donation.serviceName) {
      serviceName = donation.serviceName;
    } else if (donation.sevaId && typeof donation.sevaId === 'object') {
      // Type assertion to access name property
      const sevaObj = donation.sevaId as Service;
      if (sevaObj.name) {
        serviceName = sevaObj.name;
      }
    } else if (donation.itemName) {
      serviceName = donation.itemName; // Fallback
    }
    
    return serviceName;
  } else if (donation.service === 'महाप्रसाद') {
    // For Mahaprasad, show the item name
    if (donation.itemName) {
      return donation.itemName;
    } else if (donation.item && typeof donation.item === 'object') {
      // Type assertion to access name property
      const itemObj = donation.item as PrasadItem;
      if (itemObj.name) {
        return itemObj.name;
      }
    }
    return '-';
  } else {
    // For Abhishek, show dash
    return '-';
  }
};

// Helper function to get quantity display text
const getQuantityDisplayText = (donation: Donation): string => {
  if (donation.service === 'महाप्रसाद') {
    return `${donation.quantity || 0} ${donation.unit || ''}`;
  } else {
    return '-';
  }
};

// Helper function to get amount display
const getAmountDisplayText = (donation: Donation): string => {
  if (donation.amount && donation.amount > 0) {
    return `₹${donation.amount}`;
  }
  return '-';
};

// Helper function to get service display
const getServiceDisplayText = (donation: Donation): string => {
  if (donation.service === 'इतर') {
    // Try to get the service name from various places
    let serviceName = '';
    
    if (donation.serviceName) {
      serviceName = donation.serviceName;
    } else if (donation.sevaId && typeof donation.sevaId === 'object') {
      // Type assertion to access name property
      const sevaObj = donation.sevaId as Service;
      if (sevaObj.name) {
        serviceName = sevaObj.name;
      }
    }
    
    if (serviceName) {
      return `इतर (${serviceName})`;
    }
    return 'इतर';
  }
  return donation.service || '-';
};

// Full report with stats - VERTICAL & BLACK & WHITE
export const generateDonationsPDF = ({ donations, stats }: PDFGenerationParams) => {
  // Create a hidden div with OPTIMIZED width for portrait
  const element = document.createElement('div');
  element.style.width = '800px';
  element.style.padding = '20px';
  element.style.fontFamily = "'Noto Sans Devanagari', sans-serif";
  element.style.backgroundColor = 'white';
  element.style.color = 'black';
  element.style.fontSize = '12px';
  
  // Header
  element.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px;">
      <h1 style="font-size: 24px; margin: 0; font-weight: bold; color: black;">श्री राम मंदिर</h1>
      <h2 style="font-size: 20px; margin: 5px 0; font-weight: bold; color: black;">देणगी अहवाल</h2>
      <p style="font-size: 12px; color: #333;">${new Date().toLocaleDateString('mr-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })}</p>
    </div>
  `;
  
  // Stats in a grid
  if (stats) {
    element.innerHTML += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 25px; gap: 10px;">
        <div style="flex: 1; border: 1px solid black; padding: 12px; text-align: center;">
          <div style="font-size: 11px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 4px;">एकूण देणग्या</div>
          <div style="font-size: 18px; font-weight: bold;">${stats.totalDonations}</div>
        </div>
        <div style="flex: 1; border: 1px solid black; padding: 12px; text-align: center;">
          <div style="font-size: 11px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 4px;">एकूण रक्कम</div>
          <div style="font-size: 18px; font-weight: bold;">₹${(stats.totalAmount || 0).toLocaleString()}</div>
        </div>
        <div style="flex: 1; border: 1px solid black; padding: 12px; text-align: center;">
          <div style="font-size: 11px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 4px;">आजच्या देणग्या</div>
          <div style="font-size: 18px; font-weight: bold;">${stats.todayDonations}</div>
        </div>
        <div style="flex: 1; border: 1px solid black; padding: 12px; text-align: center;">
          <div style="font-size: 11px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 4px;">सरासरी रक्कम</div>
          <div style="font-size: 18px; font-weight: bold;">₹${Math.round(stats.avgAmount || 0)}</div>
        </div>
      </div>
    `;
  }
  
  // Table
  element.innerHTML += `
    <h3 style="font-size: 16px; margin: 20px 0 10px 0; font-weight: bold; border-bottom: 1px solid black; padding-bottom: 5px;">देणगी तपशील</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
      <colgroup>
        <col style="width: 140px">
        <col style="width: 70px">
        <col style="width: 120px">
        <col style="width: 60px">
        <col style="width: 70px">
        <col style="width: 80px">
        <col style="width: 90px">
        <col style="width: 50px">
      </colgroup>
      <thead>
        <tr style="background: #e0e0e0; border: 1px solid black;">
          <th style="padding: 8px 4px; text-align: left; border: 1px solid black; font-weight: bold;">देणगीदार</th>
          <th style="padding: 8px 4px; text-align: left; border: 1px solid black; font-weight: bold;">सेवा</th>
          <th style="padding: 8px 4px; text-align: left; border: 1px solid black; font-weight: bold;">वस्तू/सेवा</th>
          <th style="padding: 8px 4px; text-align: left; border: 1px solid black; font-weight: bold;">प्रमाण</th>
          <th style="padding: 8px 4px; text-align: right; border: 1px solid black; font-weight: bold;">रक्कम</th>
          <th style="padding: 8px 4px; text-align: left; border: 1px solid black; font-weight: bold;">दिनांक</th>
          <th style="padding: 8px 4px; text-align: left; border: 1px solid black; font-weight: bold;">मोबाईल</th>
          <th style="padding: 8px 4px; text-align: center; border: 1px solid black; font-weight: bold;">क्रिया</th>
        </tr>
      </thead>
      <tbody>
        ${donations.map((d, index) => {
          const bgColor = index % 2 === 0 ? '#f5f5f5' : 'white';
          const formattedDate = d.date ? new Date(d.date).toLocaleDateString('mr-IN') : '-';
          const itemDisplay = getItemDisplayText(d);
          const quantityDisplay = getQuantityDisplayText(d);
          const amountDisplay = getAmountDisplayText(d);
          const serviceDisplay = getServiceDisplayText(d);
          
          return `
          <tr style="background: ${bgColor};">
            <td style="padding: 6px 4px; border: 1px solid #999; word-wrap: break-word;">${d.donorName || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">
              <span style="border: 1px solid #666; padding: 2px 4px; display: inline-block; font-size: 10px;">
                ${serviceDisplay}
              </span>
            </td>
            <td style="padding: 6px 4px; border: 1px solid #999; word-wrap: break-word;">
              ${itemDisplay}
              ${d.service === 'इतर' ? '<span style="font-size: 9px; color: #555; display: block;">(सेवा)</span>' : ''}
            </td>
            <td style="padding: 6px 4px; border: 1px solid #999; text-align: center;">${quantityDisplay}</td>
            <td style="padding: 6px 4px; border: 1px solid #999; text-align: right;">${amountDisplay}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">${formattedDate}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">${d.mobile || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #999; text-align: center;">✕</td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
  `;
  
  // Calculate totals
  const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const mahaprasadCount = donations.filter(d => d.service === 'महाप्रसाद').length;
  const abhishekCount = donations.filter(d => d.service === 'अभिषेक').length;
  const otherCount = donations.filter(d => d.service === 'इतर').length;
  
  element.innerHTML += `
    <div style="margin-top: 20px; display: flex; justify-content: space-between; padding: 10px; border: 1px solid black; background: #f5f5f5;">
      <div><strong>एकूण नोंदी:</strong> ${donations.length}</div>
      <div><strong>महाप्रसाद:</strong> ${mahaprasadCount}</div>
      <div><strong>अभिषेक:</strong> ${abhishekCount}</div>
      <div><strong>इतर सेवा:</strong> ${otherCount}</div>
      <div><strong>एकूण रक्कम:</strong> ₹${totalAmount.toLocaleString()}</div>
    </div>
    <div style="margin-top: 30px; text-align: center; border-top: 1px solid #ccc; padding-top: 15px; font-style: italic;">
      धन्यवाद! 🙏
    </div>
  `;
  
  // Generate PDF
  const opt = {
    margin: [0.4, 0.4, 0.4, 0.4] as [number, number, number, number],
    filename: `देणगी_अहवाल_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg' as const, quality: 1.0 },
    html2canvas: { 
      scale: 1.8,
      useCORS: true,
      letterRendering: true,
      logging: false,
      backgroundColor: '#ffffff'
    },
    jsPDF: { 
      unit: 'in' as const,
      format: 'a4' as const,
      orientation: 'portrait' as const
    }
  };
  
  html2pdf().set(opt).from(element).save();
};

// Simple version without stats
export const generateSimpleDonationsPDF = (donations: Donation[], title: string = 'देणगी यादी') => {
  const element = document.createElement('div');
  element.style.width = '800px';
  element.style.padding = '20px';
  element.style.fontFamily = "'Noto Sans Devanagari', sans-serif";
  element.style.backgroundColor = 'white';
  element.style.color = 'black';
  element.style.fontSize = '12px';
  
  element.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px;">
      <h1 style="font-size: 24px; margin: 0; font-weight: bold; color: black;">श्री राम मंदिर</h1>
      <h2 style="font-size: 20px; margin: 5px 0; font-weight: bold; color: black;">${title}</h2>
      <p style="font-size: 12px; color: #333;">${new Date().toLocaleDateString('mr-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })}</p>
    </div>
    
    <h3 style="font-size: 16px; margin: 20px 0 10px 0; font-weight: bold; border-bottom: 1px solid black; padding-bottom: 5px;">देणगी तपशील</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
      <colgroup>
        <col style="width: 140px">
        <col style="width: 70px">
        <col style="width: 120px">
        <col style="width: 60px">
        <col style="width: 70px">
        <col style="width: 80px">
        <col style="width: 90px">
        <col style="width: 50px">
      </colgroup>
      <thead>
        <tr style="background: #e0e0e0; border: 1px solid black;">
          <th style="padding: 8px 4px; border: 1px solid black; font-weight: bold;">देणगीदार</th>
          <th style="padding: 8px 4px; border: 1px solid black; font-weight: bold;">सेवा</th>
          <th style="padding: 8px 4px; border: 1px solid black; font-weight: bold;">वस्तू/सेवा</th>
          <th style="padding: 8px 4px; border: 1px solid black; font-weight: bold;">प्रमाण</th>
          <th style="padding: 8px 4px; border: 1px solid black; font-weight: bold;">रक्कम</th>
          <th style="padding: 8px 4px; border: 1px solid black; font-weight: bold;">दिनांक</th>
          <th style="padding: 8px 4px; border: 1px solid black; font-weight: bold;">मोबाईल</th>
          <th style="padding: 8px 4px; border: 1px solid black; font-weight: bold;">क्रिया</th>
        </tr>
      </thead>
      <tbody>
        ${donations.map((d, index) => {
          const bgColor = index % 2 === 0 ? '#f5f5f5' : 'white';
          const formattedDate = d.date ? new Date(d.date).toLocaleDateString('mr-IN') : '-';
          const itemDisplay = getItemDisplayText(d);
          const quantityDisplay = getQuantityDisplayText(d);
          const amountDisplay = getAmountDisplayText(d);
          const serviceDisplay = getServiceDisplayText(d);
          
          return `
          <tr style="background: ${bgColor};">
            <td style="padding: 6px 4px; border: 1px solid #999;">${d.donorName || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">
              <span style="border: 1px solid #666; padding: 2px 4px; display: inline-block; font-size: 10px;">
                ${serviceDisplay}
              </span>
            </td>
            <td style="padding: 6px 4px; border: 1px solid #999;">
              ${itemDisplay}
              ${d.service === 'इतर' ? '<span style="font-size: 9px; color: #555; display: block;">(सेवा)</span>' : ''}
            </td>
            <td style="padding: 6px 4px; border: 1px solid #999; text-align: center;">${quantityDisplay}</td>
            <td style="padding: 6px 4px; border: 1px solid #999; text-align: right;">${amountDisplay}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">${formattedDate}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">${d.mobile || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #999; text-align: center;">✕</td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
    
    <div style="margin-top: 20px; display: flex; justify-content: space-between; padding: 8px; border: 1px solid #999; background: #f5f5f5;">
      <div><strong>एकूण नोंदी:</strong> ${donations.length}</div>
      <div><strong>महाप्रसाद:</strong> ${donations.filter(d => d.service === 'महाप्रसाद').length}</div>
      <div><strong>अभिषेक:</strong> ${donations.filter(d => d.service === 'अभिषेक').length}</div>
      <div><strong>इतर सेवा:</strong> ${donations.filter(d => d.service === 'इतर').length}</div>
      <div><strong>एकूण रक्कम:</strong> ₹${donations.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString()}</div>
    </div>
    <div style="margin-top: 30px; text-align: center; border-top: 1px solid #ccc; padding-top: 15px; font-style: italic;">
      धन्यवाद! 🙏
    </div>
  `;
  
  const opt = {
    margin: [0.4, 0.4, 0.4, 0.4] as [number, number, number, number],
    filename: `देणगी_यादी_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg' as const, quality: 1.0 },
    html2canvas: { 
      scale: 1.8, 
      useCORS: true,
      backgroundColor: '#ffffff'
    },
    jsPDF: { 
      unit: 'in' as const,
      format: 'a4' as const,
      orientation: 'portrait' as const
    }
  };
  
  html2pdf().set(opt).from(element).save();
};