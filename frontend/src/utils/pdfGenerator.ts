import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Donation, DonationStats } from '../types';

interface PDFGenerationParams {
  donations: Donation[];
  stats?: DonationStats;
  filters?: { category: string; search: string };
  title?: string;
}

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
    doc.text('श्री क्षेत्र मंदिर', 14, 20);
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 255);
    doc.text(title, 14, 30);
    
    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    doc.text(`Date: ${today}`, 14, 38);
    
    // Stats section (simplified)
    let yOffset = 45;
    if (stats) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Summary:', 14, yOffset);
      yOffset += 7;
      
      doc.setFontSize(11);
      doc.text(`Total Donations: ${stats.totalDonations || 0}`, 20, yOffset);
      doc.text(`Total Amount: ₹${(stats.totalAmount || 0).toLocaleString()}`, 100, yOffset);
      yOffset += 7;
      
      doc.text(`Today's Donations: ${stats.todayDonations || 0}`, 20, yOffset);
      doc.text(`Average Amount: ₹${Math.round(stats.avgAmount || 0)}`, 100, yOffset);
      yOffset += 10;
    }
    
    // Table
    if (donations.length === 0) {
      doc.setFontSize(14);
      doc.setTextColor(255, 0, 0);
      doc.text('No donations found', 105, yOffset + 20, { align: 'center' });
    } else {
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Donation Details', 14, yOffset);
      
      const tableData = donations.map(donation => [
        donation.donorName || '-',
        donation.service || '-',
        donation.itemName || '-',
        donation.quantity && donation.unit ? `${donation.quantity} ${donation.unit}` : '-',
        `₹${donation.amount || 0}`,
        donation.date ? new Date(donation.date).toLocaleDateString('en-IN') : '-',
        donation.mobile || '-'
      ]);
      
      autoTable(doc, {
        head: [['Donor Name', 'Service', 'Item', 'Quantity', 'Amount', 'Date', 'Mobile']],
        body: tableData,
        startY: yOffset + 5,
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          font: 'times'
        },
        headStyles: { 
          fillColor: [41, 128, 185], 
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        }
      });
      
      // Total
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Amount: ₹${totalAmount.toLocaleString()}`, 14, finalY + 10);
      doc.text(`Total Records: ${donations.length}`, 150, finalY + 10);
    }
    
    // Save the PDF
    const fileName = `donation_report_${new Date().toISOString().split('T')[0]}.pdf`;
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
export const generateSimpleDonationsPDF = (donations: Donation[], title: string = 'Donation List') => {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    doc.setFont('times', 'normal');
    
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text('Temple Name', 14, 20);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(title, 14, 30);
    
    const today = new Date().toLocaleDateString('en-IN');
    doc.setFontSize(10);
    doc.text(`Date: ${today}`, 14, 38);
    
    if (donations.length === 0) {
      doc.setFontSize(14);
      doc.setTextColor(255, 0, 0);
      doc.text('No donations found', 105, 80, { align: 'center' });
    } else {
      const tableData = donations.map(donation => [
        donation.donorName || '-',
        donation.service || '-',
        donation.itemName || '-',
        donation.quantity && donation.unit ? `${donation.quantity} ${donation.unit}` : '-',
        `₹${donation.amount || 0}`,
        donation.date ? new Date(donation.date).toLocaleDateString('en-IN') : '-',
        donation.mobile || '-'
      ]);
      
      autoTable(doc, {
        head: [['Donor Name', 'Service', 'Item', 'Quantity', 'Amount', 'Date', 'Mobile']],
        body: tableData,
        startY: 45,
        styles: { fontSize: 8, font: 'times' },
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY || 50;
      const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
      
      doc.setFontSize(11);
      doc.text(`Total Amount: ₹${totalAmount.toLocaleString()}`, 14, finalY + 10);
    }
    
    doc.save(`donation_list_${new Date().toISOString().split('T')[0]}.pdf`);
    return true;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};