import html2pdf from 'html2pdf.js';
import { Donation, DonationStats } from '../types';

interface PDFGenerationParams {
  donations: Donation[];
  stats?: DonationStats;
  filters?: { category: string; search: string };
  title?: string;
}

// Full report with stats - VERTICAL & BLACK & WHITE
export const generateDonationsPDF = ({ donations, stats }: PDFGenerationParams) => {
  // Create a hidden div with OPTIMIZED width for portrait
  const element = document.createElement('div');
  element.style.width = '800px'; // Reduced width for portrait
  element.style.padding = '20px';
  element.style.fontFamily = "'Noto Sans Devanagari', sans-serif";
  element.style.backgroundColor = 'white';
  element.style.color = 'black';
  element.style.fontSize = '12px'; // Slightly larger for portrait
  
  // Header - Black and white only
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
  
  // Stats in a grid - Black and white only
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
  
  // Table with OPTIMIZED column widths for portrait (total 800px)
  element.innerHTML += `
    <h3 style="font-size: 16px; margin: 20px 0 10px 0; font-weight: bold; border-bottom: 1px solid black; padding-bottom: 5px;">देणगी तपशील</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
      <colgroup>
        <col style="width: 140px"> <!-- देणगीदाराचे नाव -->
        <col style="width: 70px">  <!-- सेवा -->
        <col style="width: 100px"> <!-- वस्तू -->
        <col style="width: 60px">  <!-- प्रमाण -->
        <col style="width: 70px">  <!-- रक्कम -->
        <col style="width: 80px">  <!-- दिनांक -->
        <col style="width: 90px">  <!-- मोबाईल -->
        <col style="width: 50px">  <!-- क्रिया -->
      </colgroup>
      <thead>
        <tr style="background: #e0e0e0; border: 1px solid black;">
          <th style="padding: 8px 4px; text-align: left; border: 1px solid black; font-weight: bold;">देणगीदार</th>
          <th style="padding: 8px 4px; text-align: left; border: 1px solid black; font-weight: bold;">सेवा</th>
          <th style="padding: 8px 4px; text-align: left; border: 1px solid black; font-weight: bold;">वस्तू</th>
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
          
          return `
          <tr style="background: ${bgColor};">
            <td style="padding: 6px 4px; border: 1px solid #999; word-wrap: break-word;">${d.donorName || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">
              <span style="border: 1px solid #666; padding: 2px 4px; display: inline-block;">
                ${d.service || '-'}
              </span>
            </td>
            <td style="padding: 6px 4px; border: 1px solid #999; word-wrap: break-word;">${d.itemName || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">${d.quantity || 0} ${d.unit || ''}</td>
            <td style="padding: 6px 4px; border: 1px solid #999; text-align: right;">₹${d.amount || 0}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">${formattedDate}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">${d.mobile || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #999; text-align: center;">✕</td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
  `;
  
  // Total
  const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  element.innerHTML += `
    <div style="margin-top: 20px; display: flex; justify-content: space-between; padding: 10px; border: 1px solid black; background: #f5f5f5;">
      <div><strong>एकूण नोंदी:</strong> ${donations.length}</div>
      <div><strong>एकूण रक्कम:</strong> ₹${totalAmount.toLocaleString()}</div>
    </div>
    <div style="margin-top: 30px; text-align: center; border-top: 1px solid #ccc; padding-top: 15px; font-style: italic;">
      धन्यवाद! 🙏
    </div>
  `;
  
  // Generate PDF with portrait orientation - Black and white optimized
  const opt = {
    margin: [0.4, 0.4, 0.4, 0.4] as [number, number, number, number],
    filename: `देणगी_अहवाल_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg' as const, quality: 1.0 },
    html2canvas: { 
      scale: 1.8, // Higher scale for better quality in portrait
      useCORS: true,
      letterRendering: true,
      logging: false,
      backgroundColor: '#ffffff'
    },
    jsPDF: { 
      unit: 'in' as const,
      format: 'a4' as const,
      orientation: 'portrait' as const // Changed to portrait
    }
  };
  
  html2pdf().set(opt).from(element).save();
};

// Simple version without stats - VERTICAL & BLACK & WHITE
export const generateSimpleDonationsPDF = (donations: Donation[], title: string = 'देणगी यादी') => {
  const element = document.createElement('div');
  element.style.width = '800px'; // Width for portrait
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
        <col style="width: 100px">
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
          <th style="padding: 8px 4px; border: 1px solid black; font-weight: bold;">वस्तू</th>
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
          return `
          <tr style="background: ${bgColor};">
            <td style="padding: 6px 4px; border: 1px solid #999;">${d.donorName || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">${d.service || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">${d.itemName || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">${d.quantity || 0} ${d.unit || ''}</td>
            <td style="padding: 6px 4px; border: 1px solid #999; text-align: right;">₹${d.amount || 0}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">${d.date ? new Date(d.date).toLocaleDateString('mr-IN') : '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #999;">${d.mobile || '-'}</td>
            <td style="padding: 6px 4px; border: 1px solid #999; text-align: center;">✕</td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
    
    <div style="margin-top: 20px; text-align: right; font-weight: bold; border-top: 1px solid #999; padding-top: 10px;">
      एकूण रक्कम: ₹${donations.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString()}
    </div>
    <div style="margin-top: 30px; text-align: center; border-top: 1px solid #ccc; padding-top: 15px; font-style: italic;">
      धन्यवाद! 🙏
    </div>
  `;
  
  // Portrait orientation for simple version too
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
      orientation: 'portrait' as const // Changed to portrait
    }
  };
  
  html2pdf().set(opt).from(element).save();
};