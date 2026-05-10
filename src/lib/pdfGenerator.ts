import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generateInvoicePDF = (sale: any, customerOverride?: any) => {
  try {
    const doc = new jsPDF() as any;
    
    // Resolve customer info from multiple possible sources
    const customerInfo = customerOverride || sale.customer || sale.Customer || (typeof sale.customerId === 'object' ? sale.customerId : null);
    const customerName = customerInfo?.name || "Walk-in Customer";
    const customerPhone = customerInfo?.phone || "N/A";
    
    // Header
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("PHARMAFLOW", 20, 22);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    doc.text("PREMIUM PHARMACEUTICAL SOLUTIONS & HEALTHCARE", 20, 30);
    doc.text("GSTIN: 27AABCM8812F1Z5 | LICENSE NO: MH/MUM/2024/9912", 20, 35);
    doc.text("Contact: +91 98765 43210 | info@pharmaflow.io", 20, 40);
    
    // Invoice Info Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(135, 50, 55, 35, 3, 3, 'FD');
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE REFERENCE", 140, 58);
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229); // Brand Indigo
    doc.text(sale.invoiceNumber, 140, 65);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`DATE: ${new Date(sale.saleDate || new Date()).toLocaleString()}`, 140, 75);
    doc.text(`MODE: ${sale.paymentMode?.toUpperCase()}`, 140, 80);
    
    // Customer Details Section
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("PATIENT / BILLING DETAILS", 20, 55);
    
    doc.setDrawColor(241, 245, 249);
    doc.line(20, 58, 80, 58);
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Patient Name:", 20, 65);
    doc.setFont("helvetica", "bold");
    doc.text(customerName.toUpperCase(), 45, 65);
    
    doc.setFont("helvetica", "normal");
    doc.text("Contact No:", 20, 72);
    doc.text(customerPhone, 45, 72);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Status: Verified Electronic Dispensation", 20, 79);
    
    // Table
    const tableData = sale.items.map((item: any) => [
      item.name,
      item.batchNumber || "-",
      item.quantity,
      `Rs. ${item.price?.toFixed(2) || '0.00'}`,
      `Rs. ${(item.price * item.quantity)?.toFixed(2) || '0.00'}`
    ]);

    autoTable(doc, {
      startY: 85,
      head: [['ITEM DESCRIPTION', 'BATCH', 'QTY', 'UNIT PRICE', 'SUBTOTAL']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 41, 59], 
        fontSize: 8, 
        fontStyle: 'bold', 
        halign: 'center' 
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      },
      styles: { fontSize: 9, font: 'helvetica' }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Totals
    doc.setFontSize(10);
    doc.text("SUB TOTAL:", 130, finalY);
    doc.text(`Rs. ${sale.subTotal?.toFixed(2) || '0.00'}`, 190, finalY, { align: 'right' });
    
    doc.text("GST TAX (12%):", 130, finalY + 7);
    doc.text(`Rs. ${sale.totalGst?.toFixed(2) || '0.00'}`, 190, finalY + 7, { align: 'right' });
    
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.5);
    doc.line(130, finalY + 12, 190, finalY + 12);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL AMOUNT:", 130, finalY + 20);
    doc.text(`Rs. ${sale.totalAmount?.toFixed(2) || '0.00'}`, 190, finalY + 20, { align: 'right' });
    
    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("This is a computer generated invoice. No signature required.", 105, 280, { align: 'center' });
    doc.text("Thank you for choosing PharmaFlow!", 105, 285, { align: 'center' });
    
    doc.save(`${sale.invoiceNumber}.pdf`);
  } catch (err) {
    console.error("PDF Export failed:", err);
  }
};
