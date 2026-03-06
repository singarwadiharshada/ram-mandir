import html2pdf from 'html2pdf.js';
import { PrasadItem, ItemStats, UnitType } from '../types';

interface PrasadPDFGenerationParams {
  items: PrasadItem[];
  stats?: ItemStats;
  filters?: { category: string; search: string };
  title?: string;
}

// Helper function to format unit in Marathi
const formatUnit = (unit: UnitType): string => {
  const unitMap: Record<UnitType, string> = {
    'kg': 'किलो',
    'gram': 'ग्रॅम',
    'liter': 'लीटर',
    'piece': 'पीस'
  };
  return unitMap[unit] || unit;
};

// Full report with stats
export const generatePrasadItemsPDF = ({ items, stats, filters }: PrasadPDFGenerationParams) => {
  // Create a hidden div
  const element = document.createElement('div');
  element.style.width = '800px'; // Narrower for portrait
  element.style.padding = '20px';
  element.style.fontFamily = "'Noto Sans Devanagari', Arial, sans-serif";
  element.style.backgroundColor = 'white';
  element.style.color = 'black';
  element.style.fontSize = '12px';
  element.style.lineHeight = '1.4';
  
  // Header - completely black and white
  element.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px;">
      <h1 style="font-size: 24px; margin: 0; font-weight: bold; color: black;">श्री राम मंदिर</h1>
      <h2 style="font-size: 20px; margin: 5px 0; font-weight: bold; color: black;">प्रसाद वस्तू अहवाल</h2>
      <p style="font-size: 12px; margin: 5px 0; color: #333;">${new Date().toLocaleDateString('mr-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })}</p>
    </div>
  `;
  
  // Filter info
  let filterText = 'सर्व वस्तू';
  if (filters?.category && filters.category !== 'all') {
    filterText = `श्रेणी: ${filters.category}`;
  }
  if (filters?.search) {
    filterText += ` | शोध: ${filters.search}`;
  }
  
  element.innerHTML += `
    <div style="margin-bottom: 15px; font-size: 11px; text-align: right; color: #333;">
      ${filterText}
    </div>
  `;
  
  // Stats in a row - completely black and white
  if (stats) {
    element.innerHTML += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; gap: 10px; border: 1px solid #ccc; padding: 10px;">
        <div style="flex: 1; text-align: center; border-right: 1px solid #ccc; padding-right: 10px;">
          <div style="font-size: 11px; font-weight: bold; color: black;">एकूण वस्तू</div>
          <div style="font-size: 18px; font-weight: bold; color: black;">${stats.total}</div>
        </div>
        <div style="flex: 1; text-align: center; border-right: 1px solid #ccc; padding-right: 10px;">
          <div style="font-size: 11px; font-weight: bold; color: black;">पूर्ण झालेल्या</div>
          <div style="font-size: 18px; font-weight: bold; color: black;">${stats.fulfilled}</div>
        </div>
        <div style="flex: 1; text-align: center;">
          <div style="font-size: 11px; font-weight: bold; color: black;">बाकी वस्तू</div>
          <div style="font-size: 18px; font-weight: bold; color: black;">${stats.pending}</div>
        </div>
      </div>
    `;
  }
  
  // Table - completely black and white
  element.innerHTML += `
    <h3 style="font-size: 16px; margin: 15px 0 8px 0; font-weight: bold; color: black;">वस्तू तपशील</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid black;">
      <thead>
        <tr style="background-color: #f0f0f0; border-bottom: 2px solid black;">
          <th style="padding: 8px 4px; text-align: center; border: 1px solid black; font-weight: bold; color: black;">क्र</th>
          <th style="padding: 8px 4px; text-align: left; border: 1px solid black; font-weight: bold; color: black;">वस्तूचे नाव</th>
          <th style="padding: 8px 4px; text-align: center; border: 1px solid black; font-weight: bold; color: black;">श्रेणी</th>
          <th style="padding: 8px 4px; text-align: center; border: 1px solid black; font-weight: bold; color: black;">एकक</th>
          <th style="padding: 8px 4px; text-align: right; border: 1px solid black; font-weight: bold; color: black;">आवश्यक</th>
          <th style="padding: 8px 4px; text-align: right; border: 1px solid black; font-weight: bold; color: black;">मिळालेले</th>
          <th style="padding: 8px 4px; text-align: right; border: 1px solid black; font-weight: bold; color: black;">बाकी</th>
          <th style="padding: 8px 4px; text-align: center; border: 1px solid black; font-weight: bold; color: black;">प्रगती</th>
          <th style="padding: 8px 4px; text-align: center; border: 1px solid black; font-weight: bold; color: black;">स्थिती</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => {
          const remaining = item.required - item.received;
          const percentage = ((item.received / item.required) * 100).toFixed(1);
          const fulfilled = item.received >= item.required;
          const bgColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
          const statusText = fulfilled ? 'पूर्ण' : 'बाकी';
          const formattedUnit = formatUnit(item.unit);
          
          // Simple text-based progress bar (black and white)
          const progressBar = `
            <div style="display: flex; align-items: center; gap: 5px;">
              <div style="width: 40px; background-color: #e0e0e0; border: 1px solid black; height: 10px;">
                <div style="width: ${percentage}%; background-color: black; height: 10px;"></div>
              </div>
              <span style="font-size: 8px; color: black;">${percentage}%</span>
            </div>
          `;
          
          return `
          <tr style="background: ${bgColor};">
            <td style="padding: 6px 4px; border: 1px solid black; text-align: center; color: black;">${index + 1}</td>
            <td style="padding: 6px 4px; border: 1px solid black; color: black;">${item.name}</td>
            <td style="padding: 6px 4px; border: 1px solid black; text-align: center; color: black;">${item.category}</td>
            <td style="padding: 6px 4px; border: 1px solid black; text-align: center; color: black;">${formattedUnit}</td>
            <td style="padding: 6px 4px; border: 1px solid black; text-align: right; color: black;">${item.required}</td>
            <td style="padding: 6px 4px; border: 1px solid black; text-align: right; color: black;">${item.received}</td>
            <td style="padding: 6px 4px; border: 1px solid black; text-align: right; color: black;">${remaining}</td>
            <td style="padding: 6px 4px; border: 1px solid black; text-align: center; color: black;">
              ${progressBar}
            </td>
            <td style="padding: 6px 4px; border: 1px solid black; text-align: center; font-weight: bold; color: black;">
              ${statusText}
            </td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
  `;
  
  // Summary
  const totalRequired = items.reduce((sum, item) => sum + item.required, 0);
  const totalReceived = items.reduce((sum, item) => sum + item.received, 0);
  const totalRemaining = totalRequired - totalReceived;
  const fulfilledCount = items.filter(item => item.received >= item.required).length;
  
  element.innerHTML += `
    <div style="margin-top: 15px; display: flex; justify-content: space-between; padding: 8px; border: 1px solid black; background: #f5f5f5; font-size: 11px; color: black;">
      <div><strong>एकूण नोंदी:</strong> ${items.length}</div>
      <div><strong>एकूण आवश्यक:</strong> ${totalRequired.toFixed(2)}</div>
      <div><strong>एकूण मिळालेले:</strong> ${totalReceived.toFixed(2)}</div>
      <div><strong>एकूण बाकी:</strong> ${totalRemaining.toFixed(2)}</div>
      <div><strong>पूर्ण झालेल्या:</strong> ${fulfilledCount}</div>
    </div>
    <div style="margin-top: 30px; text-align: center; font-size: 11px; border-top: 1px solid black; padding-top: 10px; color: black;">
      धन्यवाद! 🙏
    </div>
  `;
  
  // PDF options - PORTRAIT orientation, black and white
  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
    filename: `प्रसाद_वस्तू_अहवाल_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.95 },
    html2canvas: { 
      scale: 1.5,
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
export const generateSimplePrasadItemsPDF = (items: PrasadItem[], title: string = 'प्रसाद वस्तू यादी') => {
  const element = document.createElement('div');
  element.style.width = '800px';
  element.style.padding = '20px';
  element.style.fontFamily = "'Noto Sans Devanagari', Arial, sans-serif";
  element.style.backgroundColor = 'white';
  element.style.color = 'black';
  element.style.fontSize = '12px';
  
  element.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px;">
      <h1 style="font-size: 24px; margin: 0; font-weight: bold; color: black;">श्री राम मंदिर</h1>
      <h2 style="font-size: 20px; margin: 5px 0; font-weight: bold; color: black;">${title}</h2>
      <p style="font-size: 12px; margin: 5px 0; color: #333;">${new Date().toLocaleDateString('mr-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })}</p>
    </div>
    
    <h3 style="font-size: 16px; margin: 15px 0 8px 0; font-weight: bold; color: black;">वस्तू तपशील</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid black;">
      <thead>
        <tr style="background-color: #f0f0f0; border-bottom: 2px solid black;">
          <th style="padding: 8px 4px; text-align: center; border: 1px solid black; font-weight: bold; color: black;">क्र</th>
          <th style="padding: 8px 4px; text-align: left; border: 1px solid black; font-weight: bold; color: black;">वस्तूचे नाव</th>
          <th style="padding: 8px 4px; text-align: center; border: 1px solid black; font-weight: bold; color: black;">श्रेणी</th>
          <th style="padding: 8px 4px; text-align: center; border: 1px solid black; font-weight: bold; color: black;">एकक</th>
          <th style="padding: 8px 4px; text-align: right; border: 1px solid black; font-weight: bold; color: black;">आवश्यक</th>
          <th style="padding: 8px 4px; text-align: right; border: 1px solid black; font-weight: bold; color: black;">मिळालेले</th>
          <th style="padding: 8px 4px; text-align: right; border: 1px solid black; font-weight: bold; color: black;">बाकी</th>
          <th style="padding: 8px 4px; text-align: center; border: 1px solid black; font-weight: bold; color: black;">स्थिती</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => {
          const remaining = item.required - item.received;
          const fulfilled = item.received >= item.required;
          const bgColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
          const statusText = fulfilled ? 'पूर्ण' : 'बाकी';
          const formattedUnit = formatUnit(item.unit);
          
          return `
          <tr style="background: ${bgColor};">
            <td style="padding: 6px 4px; border: 1px solid black; text-align: center; color: black;">${index + 1}</td>
            <td style="padding: 6px 4px; border: 1px solid black; color: black;">${item.name}</td>
            <td style="padding: 6px 4px; border: 1px solid black; text-align: center; color: black;">${item.category}</td>
            <td style="padding: 6px 4px; border: 1px solid black; text-align: center; color: black;">${formattedUnit}</td>
            <td style="padding: 6px 4px; border: 1px solid black; text-align: right; color: black;">${item.required}</td>
            <td style="padding: 6px 4px; border: 1px solid black; text-align: right; color: black;">${item.received}</td>
            <td style="padding: 6px 4px; border: 1px solid black; text-align: right; color: black;">${remaining}</td>
            <td style="padding: 6px 4px; border: 1px solid black; text-align: center; font-weight: bold; color: black;">
              ${statusText}
            </td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
    
    <div style="margin-top: 15px; text-align: right; font-weight: bold; font-size: 11px; color: black;">
      एकूण नोंदी: ${items.length}
    </div>
    <div style="margin-top: 30px; text-align: center; font-size: 11px; border-top: 1px solid black; padding-top: 10px; color: black;">
      धन्यवाद! 🙏
    </div>
  `;
  
  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
    filename: `प्रसाद_वस्तू_यादी_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.95 },
    html2canvas: { 
      scale: 1.5, 
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