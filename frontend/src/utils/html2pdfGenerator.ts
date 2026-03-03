import html2pdf from 'html2pdf.js';
import { Donation, DonationStats } from '../types';

interface PDFGenerationParams {
  donations: Donation[];
  stats?: DonationStats;
  filters?: { category: string; search: string };
  title?: string;
}

// Full report with stats
export const generateDonationsPDF = ({ donations, stats }: PDFGenerationParams) => {
  // Create a hidden div with OPTIMIZED width
  const element = document.createElement('div');
  element.style.width = '1200px'; // Reduced from 1600px
  element.style.padding = '15px';
  element.style.fontFamily = "'Noto Sans Devanagari', sans-serif";
  element.style.backgroundColor = 'white';
  element.style.fontSize = '11px'; // Smaller base font
  
  // Header
  element.innerHTML = `
    <div style="text-align: center; margin-bottom: 15px;">
      <h1 style="color: #9c27b0; font-size: 24px; margin: 0;">श्री क्षेत्र मंदिर</h1>
      <h2 style="color: #2980b9; font-size: 20px; margin: 5px 0;">देणगी अहवाल</h2>
      <p style="color: #666; font-size: 12px;">${new Date().toLocaleDateString('mr-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })}</p>
    </div>
  `;
  
  // Stats in a row - smaller
  if (stats) {
    element.innerHTML += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; gap: 8px;">
        <div style="flex: 1; background: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center;">
          <div style="color: #2980b9; font-size: 12px;">एकूण देणग्या</div>
          <div style="font-size: 18px; font-weight: bold;">${stats.totalDonations}</div>
        </div>
        <div style="flex: 1; background: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center;">
          <div style="color: #2980b9; font-size: 12px;">एकूण रक्कम</div>
          <div style="font-size: 18px; font-weight: bold;">₹${(stats.totalAmount || 0).toLocaleString()}</div>
        </div>
        <div style="flex: 1; background: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center;">
          <div style="color: #2980b9; font-size: 12px;">आजच्या देणग्या</div>
          <div style="font-size: 18px; font-weight: bold;">${stats.todayDonations}</div>
        </div>
        <div style="flex: 1; background: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center;">
          <div style="color: #2980b9; font-size: 12px;">सरासरी रक्कम</div>
          <div style="font-size: 18px; font-weight: bold;">₹${Math.round(stats.avgAmount || 0)}</div>
        </div>
      </div>
    `;
  }
  
  // Table with OPTIMIZED column widths (total 1200px)
  element.innerHTML += `
    <h3 style="font-size: 16px; margin: 15px 0 8px 0;">देणगी तपशील</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed;">
      <colgroup>
        <col style="width: 150px"> <!-- देणगीदाराचे नाव -->
        <col style="width: 80px">  <!-- सेवा -->
        <col style="width: 120px"> <!-- वस्तू -->
        <col style="width: 70px">  <!-- प्रमाण -->
        <col style="width: 70px">  <!-- रक्कम -->
        <col style="width: 80px">  <!-- दिनांक -->
        <col style="width: 100px"> <!-- मोबाईल -->
        <col style="width: 50px">  <!-- क्रिया -->
      </colgroup>
      <thead>
        <tr style="background: #2980b9; color: white;">
          <th style="padding: 8px 4px; text-align: left; border: 1px solid #2980b9; font-size: 11px;">देणगीदार</th>
          <th style="padding: 8px 4px; text-align: left; border: 1px solid #2980b9; font-size: 11px;">सेवा</th>
          <th style="padding: 8px 4px; text-align: left; border: 1px solid #2980b9; font-size: 11px;">वस्तू</th>
          <th style="padding: 8px 4px; text-align: left; border: 1px solid #2980b9; font-size: 11px;">प्रमाण</th>
          <th style="padding: 8px 4px; text-align: right; border: 1px solid #2980b9; font-size: 11px;">रक्कम</th>
          <th style="padding: 8px 4px; text-align: left; border: 1px solid #2980b9; font-size: 11px;">दिनांक</th>
          <th style="padding: 8px 4px; text-align: left; border: 1px solid #2980b9; font-size: 11px;">मोबाईल</th>
          <th style="padding: 8px 4px; text-align: center; border: 1px solid #2980b9; font-size: 11px;">क्रिया</th>
        </tr>
      </thead>
      <tbody>
        ${donations.map((d, index) => {
          const bgColor = index % 2 === 0 ? '#f9f9f9' : 'white';
          const formattedDate = d.date ? new Date(d.date).toLocaleDateString('mr-IN') : '-';
          
          return `
          <tr style="background: ${bgColor};">
            <td style="padding: 6px 4px; border: 1px solid #ddd; word-wrap: break-word;">${d.donorName || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #ddd;">
              <span style="background: #e3f2fd; color: #1976d2; padding: 2px 4px; border-radius: 3px; display: inline-block; font-size: 9px;">
                ${d.service || '-'}
              </span>
            </td>
            <td style="padding: 6px 4px; border: 1px solid #ddd; word-wrap: break-word;">${d.itemName || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #ddd;">${d.quantity || 0} ${d.unit || ''}</td>
            <td style="padding: 6px 4px; border: 1px solid #ddd; text-align: right;">₹${d.amount || 0}</td>
            <td style="padding: 6px 4px; border: 1px solid #ddd;">${formattedDate}</td>
            <td style="padding: 6px 4px; border: 1px solid #ddd; font-size: 9px;">${d.mobile || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #ddd; text-align: center;">🗑️</td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
  `;
  
  // Total
  const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  element.innerHTML += `
    <div style="margin-top: 15px; display: flex; justify-content: space-between; padding: 8px; background: #f0f0f0; border-radius: 4px; font-size: 12px;">
      <div><strong>एकूण नोंदी:</strong> ${donations.length}</div>
      <div><strong>एकूण रक्कम:</strong> ₹${totalAmount.toLocaleString()}</div>
    </div>
    <div style="margin-top: 20px; text-align: center; color: #999; font-size: 10px;">
      धन्यवाद! 🙏
    </div>
  `;
  
  // Generate PDF with landscape orientation - FIXED margin and image types
  const opt = {
    margin: [0.3, 0.3, 0.3, 0.3] as [number, number, number, number],
    filename: `देणगी_अहवाल_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 }, // Added 'as const'
    html2canvas: { 
      scale: 1.5, // Reduced scale to fit better
      useCORS: true,
      letterRendering: true,
      logging: false
    },
    jsPDF: { 
      unit: 'in' as const, // Added 'as const'
      format: 'a4' as const, // Added 'as const'
      orientation: 'landscape' as const // Added 'as const'
    }
  };
  
  html2pdf().set(opt).from(element).save();
};

// Simple version without stats
export const generateSimpleDonationsPDF = (donations: Donation[], title: string = 'देणगी यादी') => {
  const element = document.createElement('div');
  element.style.width = '1200px';
  element.style.padding = '15px';
  element.style.fontFamily = "'Noto Sans Devanagari', sans-serif";
  element.style.backgroundColor = 'white';
  element.style.fontSize = '11px';
  
  element.innerHTML = `
    <div style="text-align: center; margin-bottom: 15px;">
      <h1 style="color: #9c27b0; font-size: 24px; margin: 0;">श्री क्षेत्र मंदिर</h1>
      <h2 style="color: #2980b9; font-size: 20px; margin: 5px 0;">${title}</h2>
      <p style="color: #666; font-size: 12px;">${new Date().toLocaleDateString('mr-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })}</p>
    </div>
    
    <h3 style="font-size: 16px; margin: 15px 0 8px 0;">देणगी तपशील</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed;">
      <colgroup>
        <col style="width: 150px">
        <col style="width: 80px">
        <col style="width: 120px">
        <col style="width: 70px">
        <col style="width: 70px">
        <col style="width: 80px">
        <col style="width: 100px">
        <col style="width: 50px">
      </colgroup>
      <thead>
        <tr style="background: #2980b9; color: white;">
          <th style="padding: 8px 4px; border: 1px solid #2980b9; font-size: 11px;">देणगीदार</th>
          <th style="padding: 8px 4px; border: 1px solid #2980b9; font-size: 11px;">सेवा</th>
          <th style="padding: 8px 4px; border: 1px solid #2980b9; font-size: 11px;">वस्तू</th>
          <th style="padding: 8px 4px; border: 1px solid #2980b9; font-size: 11px;">प्रमाण</th>
          <th style="padding: 8px 4px; border: 1px solid #2980b9; font-size: 11px;">रक्कम</th>
          <th style="padding: 8px 4px; border: 1px solid #2980b9; font-size: 11px;">दिनांक</th>
          <th style="padding: 8px 4px; border: 1px solid #2980b9; font-size: 11px;">मोबाईल</th>
          <th style="padding: 8px 4px; border: 1px solid #2980b9; font-size: 11px;">क्रिया</th>
        </tr>
      </thead>
      <tbody>
        ${donations.map((d, index) => {
          const bgColor = index % 2 === 0 ? '#f9f9f9' : 'white';
          return `
          <tr style="background: ${bgColor};">
            <td style="padding: 6px 4px; border: 1px solid #ddd;">${d.donorName || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #ddd;">${d.service || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #ddd;">${d.itemName || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #ddd;">${d.quantity || 0} ${d.unit || ''}</td>
            <td style="padding: 6px 4px; border: 1px solid #ddd; text-align: right;">₹${d.amount || 0}</td>
            <td style="padding: 6px 4px; border: 1px solid #ddd;">${d.date ? new Date(d.date).toLocaleDateString('mr-IN') : '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #ddd;">${d.mobile || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #ddd; text-align: center;">🗑️</td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
    
    <div style="margin-top: 15px; text-align: right; font-weight: bold; font-size: 12px;">
      एकूण रक्कम: ₹${donations.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString()}
    </div>
    <div style="margin-top: 20px; text-align: center; color: #999; font-size: 10px;">
      धन्यवाद! 🙏
    </div>
  `;
  
  // FIXED margin and image types
  const opt = {
    margin: [0.3, 0.3, 0.3, 0.3] as [number, number, number, number],
    filename: `देणगी_यादी_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 }, // Added 'as const'
    html2canvas: { scale: 1.5, useCORS: true },
    jsPDF: { 
      unit: 'in' as const, // Added 'as const'
      format: 'a4' as const, // Added 'as const'
      orientation: 'landscape' as const // Added 'as const'
    }
  };
  
  html2pdf().set(opt).from(element).save();
};