// Remove this line:
// import html2pdf from 'html2pdf.js';

// Add these imports:
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

// Helper function to format date in Marathi
const formatMarathiDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('mr-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// Full report with stats
export const generatePrasadItemsPDF = ({ items, stats, filters }: PrasadPDFGenerationParams) => {
  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15; // 15mm margin
  let currentY = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (height: number) => {
    if (currentY + height > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // Header - completely black and white
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text('श्री राम मंदिर', pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 10;
  doc.setFontSize(20);
  doc.text('प्रसाद वस्तू अहवाल', pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(51, 51, 51);
  doc.text(formatMarathiDate(new Date()), pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 15;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // Filter info
  let filterText = 'सर्व वस्तू';
  if (filters?.category && filters.category !== 'all') {
    filterText = `श्रेणी: ${filters.category}`;
  }
  if (filters?.search) {
    filterText += ` | शोध: ${filters.search}`;
  }
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);
  doc.text(filterText, pageWidth - margin, currentY, { align: 'right' });
  currentY += 8;

  // Stats in a row - completely black and white
  if (stats) {
    checkPageBreak(35);
    
    const statWidth = (pageWidth - 2 * margin) / 3;
    
    // Draw border for stats container
    doc.setDrawColor(204, 204, 204);
    doc.setLineWidth(0.2);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 30);
    
    // Total items stat
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('एकूण वस्तू', margin + statWidth/2, currentY + 8, { align: 'center' });
    doc.setFontSize(18);
    doc.text(stats.total.toString(), margin + statWidth/2, currentY + 22, { align: 'center' });
    
    // Vertical line divider
    doc.setDrawColor(204, 204, 204);
    doc.line(margin + statWidth, currentY, margin + statWidth, currentY + 30);
    
    // Fulfilled items stat
    doc.setFontSize(11);
    doc.text('पूर्ण झालेल्या', margin + statWidth + statWidth/2, currentY + 8, { align: 'center' });
    doc.setFontSize(18);
    doc.text(stats.fulfilled.toString(), margin + statWidth + statWidth/2, currentY + 22, { align: 'center' });
    
    // Vertical line divider
    doc.line(margin + 2 * statWidth, currentY, margin + 2 * statWidth, currentY + 30);
    
    // Pending items stat
    doc.setFontSize(11);
    doc.text('बाकी वस्तू', margin + 2.5 * statWidth, currentY + 8, { align: 'center' });
    doc.setFontSize(18);
    doc.text(stats.pending.toString(), margin + 2.5 * statWidth, currentY + 22, { align: 'center' });
    
    currentY += 40;
  }

  // Table title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('वस्तू तपशील', margin, currentY);
  
  currentY += 8;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // Prepare table data with progress bar (simulated with text)
  const tableBody = items.map((item, index) => {
    const remaining = item.required - item.received;
    const percentage = ((item.received / item.required) * 100).toFixed(1);
    const fulfilled = item.received >= item.required;
    const statusText = fulfilled ? 'पूर्ण' : 'बाकी';
    const formattedUnit = formatUnit(item.unit);
    
    return [
      (index + 1).toString(),
      item.name,
      item.category,
      formattedUnit,
      item.required.toString(),
      item.received.toString(),
      remaining.toString(),
      `${percentage}%`, // Progress percentage
      statusText
    ];
  });

  // Generate table
  autoTable(doc, {
    head: [['क्र', 'वस्तूचे नाव', 'श्रेणी', 'एकक', 'आवश्यक', 'मिळालेले', 'बाकी', 'प्रगती', 'स्थिती']],
    body: tableBody,
    startY: currentY,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      font: 'helvetica',
      halign: 'left'
    },
    headStyles: {
      fillColor: [240, 240, 240], // #f0f0f0
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineColor: [0, 0, 0],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, // क्र
      1: { cellWidth: 35 }, // वस्तूचे नाव
      2: { cellWidth: 20, halign: 'center' }, // श्रेणी
      3: { cellWidth: 15, halign: 'center' }, // एकक
      4: { cellWidth: 15, halign: 'right' }, // आवश्यक
      5: { cellWidth: 15, halign: 'right' }, // मिळालेले
      6: { cellWidth: 15, halign: 'right' }, // बाकी
      7: { cellWidth: 18, halign: 'center' }, // प्रगती
      8: { cellWidth: 15, halign: 'center', fontStyle: 'bold' } // स्थिती
    },
    alternateRowStyles: {
      fillColor: [249, 249, 249] // #f9f9f9
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      // Add footer on each page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `पृष्ठ ${i} / ${pageCount}`,
          pageWidth - margin,
          pageHeight - 10,
          { align: 'right' }
        );
      }
    }
  });

  // Get the last Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY || currentY + 50;

  // Calculate totals
  const totalRequired = items.reduce((sum, item) => sum + item.required, 0);
  const totalReceived = items.reduce((sum, item) => sum + item.received, 0);
  const totalRemaining = totalRequired - totalReceived;
  const fulfilledCount = items.filter(item => item.received >= item.required).length;

  // Summary section
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, finalY + 10, pageWidth - 2 * margin, 12);
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, finalY + 10, pageWidth - 2 * margin, 12, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  
  const summaryWidth = (pageWidth - 2 * margin) / 5;
  doc.text(`एकूण नोंदी: ${items.length}`, margin + 5, finalY + 18);
  doc.text(`आवश्यक: ${totalRequired.toFixed(2)}`, margin + summaryWidth + 5, finalY + 18);
  doc.text(`मिळालेले: ${totalReceived.toFixed(2)}`, margin + 2 * summaryWidth + 5, finalY + 18);
  doc.text(`बाकी: ${totalRemaining.toFixed(2)}`, margin + 3 * summaryWidth + 5, finalY + 18);
  doc.text(`पूर्ण: ${fulfilledCount}`, margin + 4 * summaryWidth + 5, finalY + 18);

  // Footer with thank you message
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(margin, finalY + 35, pageWidth - margin, finalY + 35);
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.text('धन्यवाद! 🙏', pageWidth / 2, finalY + 50, { align: 'center' });

  // Save PDF
  doc.save(`प्रसाद_वस्तू_अहवाल_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Simple version without stats
export const generateSimplePrasadItemsPDF = (items: PrasadItem[], title: string = 'प्रसाद वस्तू यादी') => {
  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = margin;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text('श्री राम मंदिर', pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 10;
  doc.setFontSize(20);
  doc.text(title, pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(51, 51, 51);
  doc.text(formatMarathiDate(new Date()), pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 15;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 15;

  // Table title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('वस्तू तपशील', margin, currentY);
  
  currentY += 8;
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // Prepare table data
  const tableBody = items.map((item, index) => {
    const remaining = item.required - item.received;
    const fulfilled = item.received >= item.required;
    const statusText = fulfilled ? 'पूर्ण' : 'बाकी';
    const formattedUnit = formatUnit(item.unit);
    
    return [
      (index + 1).toString(),
      item.name,
      item.category,
      formattedUnit,
      item.required.toString(),
      item.received.toString(),
      remaining.toString(),
      statusText
    ];
  });

  // Generate table
  autoTable(doc, {
    head: [['क्र', 'वस्तूचे नाव', 'श्रेणी', 'एकक', 'आवश्यक', 'मिळालेले', 'बाकी', 'स्थिती']],
    body: tableBody,
    startY: currentY,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineColor: [0, 0, 0],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 40 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [249, 249, 249]
    },
    margin: { left: margin, right: margin }
  });

  // Get final Y position
  const finalY = (doc as any).lastAutoTable.finalY || currentY + 50;

  // Summary
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, finalY + 10, pageWidth - margin, finalY + 10);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`एकूण नोंदी: ${items.length}`, pageWidth - margin, finalY + 20, { align: 'right' });

  // Footer
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(margin, finalY + 35, pageWidth - margin, finalY + 35);
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.text('धन्यवाद! 🙏', pageWidth / 2, finalY + 50, { align: 'center' });

  // Save PDF
  doc.save(`प्रसाद_वस्तू_यादी_${new Date().toISOString().split('T')[0]}.pdf`);
};