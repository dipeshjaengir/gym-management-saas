import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// ----------------------------------------------------
// 1. EXCEL EXPORT UTILITY (SheetJS / xlsx)
// ----------------------------------------------------
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

// ----------------------------------------------------
// 2. RECEIPT PDF GENERATOR (jsPDF)
// ----------------------------------------------------
export function generateReceiptPDF(receipt: {
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  pendingAmount: number;
  paymentMethod: string;
  notes: string;
  operatorName?: string;
  originalPrice?: number;
  discount?: number;
  finalPayable?: number;
  previousOutstanding?: number;
  currentOutstanding?: number;
  totalOutstanding?: number;
  member: {
    name: string;
    phone: string;
    address: string;
    planId?: {
      name: string;
    } | null;
  } | null;
  branding: {
    logo?: string;
    gymName: string;
    address: string;
    contactNumber: string;
  };
}) {
  const doc = new jsPDF();

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(receipt.branding.gymName, 105, 25, { align: 'center' });

  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('MEMBERSHIP FEES TAX INVOICE & RECEIPT', 105, 32, { align: 'center' });
  doc.text(receipt.branding.address, 105, 38, { align: 'center' });
  doc.text(`Contact: ${receipt.branding.contactNumber}`, 105, 44, { align: 'center' });

  // Divider Line
  doc.setLineWidth(0.5);
  doc.line(15, 50, 195, 50);

  // Metadata Grid
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Details:', 15, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt Number: ${receipt.receiptNumber}`, 15, 67);
  doc.text(`Date & Time: ${new Date(receipt.paymentDate).toLocaleString('en-IN')}`, 15, 74);
  doc.text(`Payment Method: ${receipt.paymentMethod.toUpperCase()}`, 15, 81);
  doc.text(`Collected By: ${receipt.operatorName || 'Admin'}`, 15, 88);

  doc.setFont('helvetica', 'bold');
  doc.text('Received From:', 120, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${receipt.member?.name || 'Gym Member'}`, 120, 67);
  doc.text(`Phone: ${receipt.member?.phone || 'N/A'}`, 120, 74);
  doc.text(`Plan Name: ${receipt.member?.planId?.name || 'Gym Membership'}`, 120, 81);

  // Items Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(15, 95, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 18, 101);
  doc.text('Amount (INR)', 160, 101);

  // Table Row
  doc.setFont('helvetica', 'normal');
  doc.text(`Gym Membership Fees - ${receipt.member?.planId?.name || 'Custom Plan'}`, 18, 112);
  doc.text(`Rs. ${receipt.amount}.00`, 160, 112);

  // Table Divider Line
  doc.line(15, 118, 195, 118);

  // Totals Panel
  let currentY = 128;
  if (receipt.originalPrice !== undefined) {
    doc.setFont('helvetica', 'normal');
    doc.text('Original Plan Price:', 110, currentY);
    doc.text(`Rs. ${receipt.originalPrice}.00`, 160, currentY);
    currentY += 7;

    doc.text('Discount Given:', 110, currentY);
    doc.text(`Rs. ${receipt.discount || 0}.00`, 160, currentY);
    currentY += 7;

    doc.text('Final Payable Amount:', 110, currentY);
    doc.text(`Rs. ${receipt.finalPayable}.00`, 160, currentY);
    currentY += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Amount Paid (Current):', 110, currentY);
    doc.text(`Rs. ${receipt.amount}.00`, 160, currentY);
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.text('Previous Outstanding:', 110, currentY);
    doc.text(`Rs. ${receipt.previousOutstanding || 0}.00`, 160, currentY);
    currentY += 7;

    doc.text('Current Membership Due:', 110, currentY);
    doc.text(`Rs. ${receipt.currentOutstanding || 0}.00`, 160, currentY);
    currentY += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Total Outstanding Due:', 110, currentY);
    doc.text(`Rs. ${receipt.totalOutstanding || 0}.00`, 160, currentY);
    currentY += 7;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount Collected:', 110, currentY);
    doc.text(`Rs. ${receipt.amount}.00`, 160, currentY);
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.text('Outstanding Balance Dues:', 110, currentY);
    doc.text(`Rs. ${receipt.pendingAmount}.00`, 160, currentY);
    currentY += 7;
  }

  if (receipt.notes) {
    doc.setFont('helvetica', 'italic');
    doc.text(`Remarks: ${receipt.notes}`, 15, currentY + 12);
  }

  // Footer Message
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for working out with us!', 105, currentY + 32, { align: 'center' });

  // Save the generated document
  doc.save(`receipt-${receipt.receiptNumber}.pdf`);
}

// ----------------------------------------------------
// 3. MEMBER DIGITAL CARD PDF GENERATOR (jsPDF)
// ----------------------------------------------------
export function generateMemberCardPDF(member: {
  name: string;
  qrCode: string;
  phone: string;
}, gymName: string) {
  // Setup CR80 credit card layout dimensions (85mm x 54mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85, 54]
  });

  // Card Background Gradient
  doc.setFillColor(15, 23, 42); // Rich dark slate matching premium branding
  doc.rect(0, 0, 85, 54, 'F');

  // Top header highlight border
  doc.setFillColor(139, 92, 246); // Indigo highlight accent
  doc.rect(0, 0, 85, 3, 'F');

  // Gym Name Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(gymName.toUpperCase(), 42.5, 10, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(156, 163, 175);
  doc.text('MEMBER ACCESS CARD', 42.5, 13, { align: 'center' });

  // Member Information
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(member.name, 8, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(`Phone: ${member.phone}`, 8, 30);
  doc.text(`Pass Code: ${member.qrCode}`, 8, 35);

  // QR Code placeholder image using static server api
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${member.qrCode}`;
  
  // We place a barcode outline representation on the card
  doc.setFillColor(255, 255, 255);
  doc.rect(56, 20, 22, 22, 'F');
  
  // Render QR image block text
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('SCAN ME', 67, 40, { align: 'center' });

  // Add QR image to PDF
  doc.addImage(qrUrl, 'JPEG', 57, 21, 20, 20);

  // Footer Disclaimer
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(5);
  doc.text('Non-transferable. Settle payments regularly to keep card active.', 42.5, 49, { align: 'center' });

  doc.save(`member-card-${member.name.replace(/\s+/g, '-')}.pdf`);
}

// ----------------------------------------------------
// 4. REVENUE REPORT PDF GENERATOR (jsPDF)
// ----------------------------------------------------
export function generateRevenueReportPDF(metrics: {
  totalGymOwners: number;
  activeGymOwners: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  expectedRenewalRevenue: number;
}) {
  const doc = new jsPDF();

  // Document title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('PLATFORM REVENUE MONITORING REPORT', 105, 25, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report Compiled: ${new Date().toLocaleString('en-IN')}`, 105, 31, { align: 'center' });

  // Divider Line
  doc.line(15, 38, 195, 38);

  // KPI table list
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Platform Metrics Telemetry:', 15, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  // Metric blocks
  doc.text(`Total Registered Gym Owners:`, 15, 62);
  doc.text(String(metrics.totalGymOwners), 120, 62);

  doc.text(`Active Workspace Tenants:`, 15, 72);
  doc.text(String(metrics.activeGymOwners), 120, 72);

  doc.setLineWidth(0.3);
  doc.line(15, 79, 195, 79);

  doc.setFont('helvetica', 'bold');
  doc.text(`Monthly SaaS Revenue Collection:`, 15, 89);
  doc.text(`Rs. ${metrics.monthlyRevenue}.00`, 120, 89);

  doc.text(`Yearly SaaS Revenue Collection:`, 15, 99);
  doc.text(`Rs. ${metrics.yearlyRevenue}.00`, 120, 99);

  doc.setFont('helvetica', 'normal');
  doc.text(`Expected Expiry Renewal Collections:`, 15, 109);
  doc.text(`Rs. ${metrics.expectedRenewalRevenue}.00`, 120, 109);

  doc.line(15, 116, 195, 116);

  // Disclaimer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Security verification code: FIT-REPORT-IMMUTABLE-SECURED', 15, 130);

  doc.save('revenue-reports.pdf');
}

export function exportToCSV(data: any[], fileName: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Add headers row
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] ?? '';
      const escape = ('' + val).replace(/"/g, '""');
      return `"${escape}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
