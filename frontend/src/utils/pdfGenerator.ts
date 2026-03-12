import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Donation, DonationStats } from '../types';

interface PDFGenerationParams {
  donations: Donation[];
  stats?: DonationStats;
  filters?: { category: string; search: string };
  title?: string;
}

// Helper function to get display text for item column
const getItemDisplayText = (donation: Donation): string => {
  if (donation.service === 'इतर') {
    // For "इतर" category, show the Seva name (service name)
    return donation.serviceName || 'सेवा';
  } else if (donation.service === 'महाप्रसाद') {
    // For Mahaprasad, show the item name
    return donation.itemName || '-';
  } else {
    // For Abhishek, show dash
    return '-';
  }
};

// Helper function to get quantity display text
const getQuantityDisplayText = (donation: Donation): string => {
  if (donation.service === 'महाप्रसाद' && donation.quantity && donation.unit) {
    return `${donation.quantity} ${donation.unit}`;
  } else {
    // For Abhishek and "इतर", show dash
    return '-';
  }
};

// Helper function to get service display with category
const getServiceDisplayText = (donation: Donation): string => {
  if (donation.service === 'इतर' && donation.serviceName) {
    return `इतर (${donation.serviceName})`;
  }
  return donation.service || '-';
};

/**
 * Generate detailed PDF report with statistics and filtered donations
 */
export const generateDonationsPDF = ({ 
  donations, 
  stats, 
  filters,
  title = 'देणगी अहवाल'
}: PDFGenerationParams) => {
  try {
    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Use a font that supports Unicode (Times has good support)
    doc.setFont('times', 'normal');
    
    // Add metadata
    doc.setProperties({
      title: 'देणगी अहवाल',
      subject: 'देणगी व्यवस्थापन',
      author: 'Temple Management System',
      creator: 'Temple App'
    });

    // Header - using simple text without complex formatting
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text('श्री राम मंदिर, शाहूपुरी', 14, 20);
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 255);
    doc.text(title, 14, 30);
    
    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const today = new Date().toLocaleDateString('mr-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    doc.text(`दिनांक: ${today}`, 14, 38);
    
    // Stats section
    let yOffset = 45;
    if (stats) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('सारांश:', 14, yOffset);
      yOffset += 7;
      
      doc.setFontSize(11);
      doc.text(`एकूण देणग्या: ${stats.totalDonations || 0}`, 20, yOffset);
      doc.text(`एकूण रक्कम: ₹${(stats.totalAmount || 0).toLocaleString()}`, 100, yOffset);
      yOffset += 7;
      
      doc.text(`आजच्या देणग्या: ${stats.todayDonations || 0}`, 20, yOffset);
      doc.text(`सरासरी रक्कम: ₹${Math.round(stats.avgAmount || 0)}`, 100, yOffset);
      yOffset += 10;
    }
    
    // Table
    if (donations.length === 0) {
      doc.setFontSize(14);
      doc.setTextColor(255, 0, 0);
      doc.text('कोणत्याही देणग्या आढळल्या नाहीत', 105, yOffset + 20, { align: 'center' });
    } else {
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('देणगी तपशील', 14, yOffset);
      
      const tableData = donations.map(donation => {
        const itemDisplay = getItemDisplayText(donation);
        const quantityDisplay = getQuantityDisplayText(donation);
        const serviceDisplay = getServiceDisplayText(donation);
        
        return [
          donation.donorName || '-',
          serviceDisplay,
          itemDisplay,
          quantityDisplay,
          `₹${donation.amount || 0}`,
          donation.date ? new Date(donation.date).toLocaleDateString('mr-IN') : '-',
          donation.mobile || '-'
        ];
      });
      
      autoTable(doc, {
        head: [['देणगीदार', 'सेवा', 'वस्तू/सेवा', 'प्रमाण', 'रक्कम', 'दिनांक', 'मोबाईल']],
        body: tableData,
        startY: yOffset + 5,
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          font: 'times',
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: { 
          fillColor: [41, 128, 185], 
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 40 }, // Donor Name
          1: { cellWidth: 45 }, // Service (with Seva name)
          2: { cellWidth: 45 }, // Item/Service
          3: { cellWidth: 25 }, // Quantity
          4: { cellWidth: 25, halign: 'right' }, // Amount
          5: { cellWidth: 30 }, // Date
          6: { cellWidth: 30 }  // Mobile
        }
      });
      
      // Calculate category-wise totals
      const mahaprasadCount = donations.filter(d => d.service === 'महाप्रसाद').length;
      const abhishekCount = donations.filter(d => d.service === 'अभिषेक').length;
      const otherCount = donations.filter(d => d.service === 'इतर').length;
      
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      // Summary footer
      doc.text(`एकूण रक्कम: ₹${totalAmount.toLocaleString()}`, 14, finalY + 10);
      doc.text(`एकूण नोंदी: ${donations.length}`, 100, finalY + 10);
      
      // Category breakdown
      doc.text(`महाप्रसाद: ${mahaprasadCount}`, 14, finalY + 17);
      doc.text(`अभिषेक: ${abhishekCount}`, 70, finalY + 17);
      doc.text(`इतर सेवा: ${otherCount}`, 120, finalY + 17);
      
      // Add footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('धन्यवाद! 🙏', 14, finalY + 25);
    }
    
    // Save the PDF
    const fileName = `देणगी_अहवाल_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    return true;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};

/**
 * Generate simplified PDF list
 */
export const generateSimpleDonationsPDF = (donations: Donation[], title: string = 'देणगी यादी') => {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    doc.setFont('times', 'normal');
    
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text('श्री राम मंदिर', 14, 20);
    
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 255);
    doc.text(title, 14, 30);
    
    const today = new Date().toLocaleDateString('mr-IN');
    doc.setFontSize(10);
    doc.text(`दिनांक: ${today}`, 14, 38);
    
    if (donations.length === 0) {
      doc.setFontSize(14);
      doc.setTextColor(255, 0, 0);
      doc.text('कोणत्याही देणग्या आढळल्या नाहीत', 105, 80, { align: 'center' });
    } else {
      const tableData = donations.map(donation => {
        const itemDisplay = getItemDisplayText(donation);
        const quantityDisplay = getQuantityDisplayText(donation);
        const serviceDisplay = getServiceDisplayText(donation);
        
        return [
          donation.donorName || '-',
          serviceDisplay,
          itemDisplay,
          quantityDisplay,
          `₹${donation.amount || 0}`,
          donation.date ? new Date(donation.date).toLocaleDateString('mr-IN') : '-',
          donation.mobile || '-'
        ];
      });
      
      autoTable(doc, {
        head: [['देणगीदार', 'सेवा', 'वस्तू/सेवा', 'प्रमाण', 'रक्कम', 'दिनांक', 'मोबाईल']],
        body: tableData,
        startY: 45,
        styles: { 
          fontSize: 8, 
          font: 'times',
          cellWidth: 'wrap'
        },
        headStyles: { 
          fillColor: [41, 128, 185], 
          textColor: [255, 255, 255],
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 45 },
          2: { cellWidth: 45 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 30 },
          6: { cellWidth: 30 }
        }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY || 50;
      const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
      
      // Category counts
      const mahaprasadCount = donations.filter(d => d.service === 'महाप्रसाद').length;
      const abhishekCount = donations.filter(d => d.service === 'अभिषेक').length;
      const otherCount = donations.filter(d => d.service === 'इतर').length;
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`एकूण रक्कम: ₹${totalAmount.toLocaleString()}`, 14, finalY + 10);
      doc.text(`महाप्रसाद: ${mahaprasadCount} | अभिषेक: ${abhishekCount} | इतर: ${otherCount}`, 14, finalY + 17);
      doc.text(`एकूण नोंदी: ${donations.length}`, 150, finalY + 10);
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('धन्यवाद! 🙏', 14, finalY + 25);
    }
    
    doc.save(`देणगी_यादी_${new Date().toISOString().split('T')[0]}.pdf`);
    return true;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};