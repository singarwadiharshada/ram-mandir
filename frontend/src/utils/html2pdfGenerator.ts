import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Donation, DonationStats } from '../types';

interface PDFGenerationParams {
  donations: Donation[];
  stats?: DonationStats;
  filters?: { category: string; search: string };
  title?: string;
}

// Helper function to format dates in Marathi
const formatMarathiDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('mr-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// Full report with stats - VERTICAL & BLACK & WHITE
export const generateDonationsPDF = ({ donations, stats }: PDFGenerationParams) => {
  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15; // 15mm margin on all sides
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

  // Header - Black and white only
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text('श्री राम मंदिर', pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 10;
  doc.setFontSize(20);
  doc.text('देणगी अहवाल', pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(51, 51, 51); // #333
  doc.text(formatMarathiDate(new Date()), pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 15;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // Stats in a grid - Black and white only
  if (stats) {
    const statWidth = (pageWidth - 2 * margin - 30) / 4; // 30mm total gap between boxes
    
    // Check if stats section needs a new page
    checkPageBreak(45);

    // Stat boxes
    const stats_data = [
      { label: 'एकूण देणग्या', value: stats.totalDonations.toString() },
      { label: 'एकूण रक्कम', value: `₹${(stats.totalAmount || 0).toLocaleString()}` },
      { label: 'आजच्या देणग्या', value: stats.todayDonations.toString() },
      { label: 'सरासरी रक्कम', value: `₹${Math.round(stats.avgAmount || 0)}` }
    ];

    stats_data.forEach((stat, index) => {
      const x = margin + (index * (statWidth + 10));
      
      // Box border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(x, currentY, statWidth, 35);
      
      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(stat.label, x + statWidth/2, currentY + 8, { align: 'center' });
      
      // Underline
      doc.setDrawColor(204, 204, 204);
      doc.line(x + 5, currentY + 12, x + statWidth - 5, currentY + 12);
      
      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(stat.value, x + statWidth/2, currentY + 25, { align: 'center' });
    });
    
    currentY += 45;
  }

  // Table title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('देणगी तपशील', margin, currentY);
  
  currentY += 8;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // Prepare table data
  const tableBody = donations.map((d, index) => {
    const formattedDate = d.date ? new Date(d.date).toLocaleDateString('mr-IN') : '-';
    return [
      d.donorName || '-',
      d.service || '-',
      d.itemName || '-',
      `${d.quantity || 0} ${d.unit || ''}`.trim(),
      `₹${d.amount || 0}`,
      formattedDate,
      d.mobile || '-',
      '✕'
    ];
  });

  // Generate table
  autoTable(doc, {
    head: [['देणगीदार', 'सेवा', 'वस्तू', 'प्रमाण', 'रक्कम', 'दिनांक', 'मोबाईल', 'क्रिया']],
    body: tableBody,
    startY: currentY,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      font: 'helvetica',
      halign: 'left'
    },
    headStyles: {
      fillColor: [224, 224, 224], // #e0e0e0
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineColor: [0, 0, 0],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 35 }, // donor name
      1: { cellWidth: 20 }, // service
      2: { cellWidth: 30 }, // item
      3: { cellWidth: 15, halign: 'center' }, // quantity
      4: { cellWidth: 20, halign: 'right' }, // amount
      5: { cellWidth: 25, halign: 'center' }, // date
      6: { cellWidth: 25 }, // mobile
      7: { cellWidth: 15, halign: 'center' } // action
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245] // #f5f5f5
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
  const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  
  // Total section
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, finalY + 10, pageWidth - 2 * margin, 15);
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, finalY + 10, pageWidth - 2 * margin, 15, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`एकूण नोंदी: ${donations.length}`, margin + 5, finalY + 20);
  doc.text(`एकूण रक्कम: ₹${totalAmount.toLocaleString()}`, pageWidth - margin - 5, finalY + 20, { align: 'right' });

  // Footer with thank you message
  doc.setDrawColor(204, 204, 204);
  doc.setLineWidth(0.2);
  doc.line(margin, finalY + 35, pageWidth - margin, finalY + 35);
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('धन्यवाद! 🙏', pageWidth / 2, finalY + 50, { align: 'center' });

  // Save PDF
  doc.save(`देणगी_अहवाल_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Simple version without stats
export const generateSimpleDonationsPDF = (donations: Donation[], title: string = 'देणगी यादी') => {
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
  doc.text('देणगी तपशील', margin, currentY);
  
  currentY += 8;
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // Prepare table data
  const tableBody = donations.map((d) => {
    const formattedDate = d.date ? new Date(d.date).toLocaleDateString('mr-IN') : '-';
    return [
      d.donorName || '-',
      d.service || '-',
      d.itemName || '-',
      `${d.quantity || 0} ${d.unit || ''}`.trim(),
      `₹${d.amount || 0}`,
      formattedDate,
      d.mobile || '-',
      '✕'
    ];
  });

  // Generate table
  autoTable(doc, {
    head: [['देणगीदार', 'सेवा', 'वस्तू', 'प्रमाण', 'रक्कम', 'दिनांक', 'मोबाईल', 'क्रिया']],
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
      fillColor: [224, 224, 224],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineColor: [0, 0, 0],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 20 },
      2: { cellWidth: 30 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 25, halign: 'center' },
      6: { cellWidth: 25 },
      7: { cellWidth: 15, halign: 'center' }
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { left: margin, right: margin }
  });

  // Get final Y position
  const finalY = (doc as any).lastAutoTable.finalY || currentY + 50;

  // Total amount
  const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, finalY + 10, pageWidth - margin, finalY + 10);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`एकूण रक्कम: ₹${totalAmount.toLocaleString()}`, pageWidth - margin, finalY + 20, { align: 'right' });

  // Footer
  doc.setDrawColor(204, 204, 204);
  doc.setLineWidth(0.2);
  doc.line(margin, finalY + 35, pageWidth - margin, finalY + 35);
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(12);
  doc.text('धन्यवाद! 🙏', pageWidth / 2, finalY + 50, { align: 'center' });

  // Save PDF
  doc.save(`देणगी_यादी_${new Date().toISOString().split('T')[0]}.pdf`);
};