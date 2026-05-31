const PDFDocument = require('pdfkit');
const axios = require('axios');

async function getQrCodeBuffer(upiId, storeName, amount) {
  if (!upiId || amount <= 0) return null;
  try {
    const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Clearance of Dues')}`;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUri)}`;
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
    return Buffer.from(response.data);
  } catch (err) {
    console.error('Failed to fetch real UPI QR code buffer:', err.message);
    return null;
  }
}

async function getVerificationQrBuffer(customerId) {
  if (!customerId) return null;
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendUrl}/pay/${customerId}`;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
    return Buffer.from(response.data);
  } catch (err) {
    console.error('Failed to fetch verification QR code buffer:', err.message);
    return null;
  }
}

const drawFallbackQR = (doc, qrX, qrY) => {
  doc.rect(qrX, qrY, 50, 50).fillColor('#F3F4F6').fill();
  doc.rect(qrX, qrY, 50, 50).strokeColor('#D1D5DB').lineWidth(1).stroke();
  doc.rect(qrX + 4, qrY + 4, 12, 12).fillColor('#111827').fill();
  doc.rect(qrX + 34, qrY + 4, 12, 12).fillColor('#111827').fill();
  doc.rect(qrX + 4, qrY + 34, 12, 12).fillColor('#111827').fill();
  doc.rect(qrX + 22, qrY + 10, 6, 6).fillColor('#111827').fill();
  doc.rect(qrX + 22, qrY + 22, 6, 6).fillColor('#111827').fill();
  doc.rect(qrX + 10, qrY + 22, 6, 6).fillColor('#111827').fill();
  doc.rect(qrX + 34, qrY + 22, 6, 6).fillColor('#111827').fill();
  doc.rect(qrX + 34, qrY + 34, 6, 6).fillColor('#111827').fill();
};

/**
 * Generate a monthly statement PDF and stream it to the HTTP response
 * @param {Object} store - Store owner info { storeName, name, phone }
 * @param {Object} customer - Customer info { name, phone, address, balance }
 * @param {Array} transactions - Array of transaction objects
 * @param {Object} dateRange - { startDate, endDate }
 * @param {Object} res - Express response object
 */
const buildPDFDocument = (store, customer, transactions, dateRange, doc, qrBuffer) => {
  // ─── TOP HEADER ───
  // Left: Store/Company Info
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#111827').text(store.storeName, 40, 40);
  doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`Owner: ${store.name}`, 40, 60);
  if (store.phone) {
    doc.text(`Phone: ${store.phone}`, 40, 72);
  }
  doc.text(`Email: support@digitaludhar.com`, 40, 84);

  // Right: Title & Metadata
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#111827').text('STATEMENT OF ACCOUNT', 300, 40, { align: 'right', width: 255 });
  doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text(`Statement Period`, 300, 60, { align: 'right', width: 255 });
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text(`${dateRange.startDate} to ${dateRange.endDate}`, 300, 72, { align: 'right', width: 255 });
  doc.fontSize(8).font('Helvetica').fillColor('#6B7280').text(`Generated: ${new Date().toLocaleString('en-IN')}`, 300, 86, { align: 'right', width: 255 });

  // Divider
  doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(40, 105).lineTo(555, 105).stroke();

  // ─── CARDS SECTION ───
  const cardY = 120;
  const colWidth = 248;
  const cardHeight = 90;

  // Left Card: Customer Details
  doc.roundedRect(40, cardY, colWidth, cardHeight, 8).fillColor('#F9FAFB').fill();
  doc.roundedRect(40, cardY, colWidth, cardHeight, 8).strokeColor('#E5E7EB').lineWidth(1).stroke();
  doc.rect(40, cardY, 3, cardHeight).fillColor('#111827').fill();

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#6B7280').text('CUSTOMER DETAILS', 52, cardY + 10);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(customer.name, 52, cardY + 24);
  doc.fontSize(9).font('Helvetica').fillColor('#374151').text(`Phone: ${customer.phone}`, 52, cardY + 40);
  doc.fontSize(9).font('Helvetica').fillColor('#374151').text(`Address: ${customer.address || 'Not specified'}`, 52, cardY + 54);

  // Right Card: Account Summary
  doc.roundedRect(307, cardY, colWidth, cardHeight, 8).fillColor('#F9FAFB').fill();
  doc.roundedRect(307, cardY, colWidth, cardHeight, 8).strokeColor('#E5E7EB').lineWidth(1).stroke();
  doc.rect(307, cardY, 3, cardHeight).fillColor('#111827').fill();

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#6B7280').text('ACCOUNT SUMMARY', 319, cardY + 10);

  const totalCredit = transactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebit = transactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = customer.balance;

  doc.fontSize(9).font('Helvetica').fillColor('#374151').text('Total You Gave (Udhar):', 319, cardY + 24);
  doc.font('Helvetica-Bold').fillColor('#111827').text(`Rs. ${totalCredit.toLocaleString('en-IN')}`, 450, cardY + 24, { align: 'right', width: 95 });

  doc.fontSize(9).font('Helvetica').fillColor('#374151').text('Total You Got (Jama):', 319, cardY + 38);
  doc.font('Helvetica-Bold').text(`Rs. ${totalDebit.toLocaleString('en-IN')}`, 450, cardY + 38, { align: 'right', width: 95 });

  const balanceColor = netBalance > 0 ? '#EF4444' : '#10B981';
  const balanceLabel = netBalance > 0 ? 'Due (You will get)' : 'Advance (You will give)';

  doc.roundedRect(314, cardY + 54, 234, 28, 4).fillColor(netBalance > 0 ? '#FEF2F2' : '#F0FDF4').fill();
  doc.fontSize(9).font('Helvetica-Bold').fillColor(balanceColor).text('Net Outstanding:', 320, cardY + 62);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(balanceColor).text(`Rs. ${Math.abs(netBalance).toLocaleString('en-IN')}`, 420, cardY + 61, { align: 'right', width: 120 });

  // ─── TRANSACTIONS TABLE ───
  let currentY = 230;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('TRANSACTION LOG', 40, currentY);

  const tableTop = currentY + 15;
  const col1 = 40;  // Date
  const col2 = 130; // Type
  const col3 = 210; // Description
  const col4 = 380; // Amount
  const col5 = 470; // Balance

  // Table header background
  doc.rect(col1, tableTop, 515, 20).fill('#111827');

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#FFFFFF');
  doc.text('Date', col1 + 8, tableTop + 6, { width: 80 });
  doc.text('Type', col2 + 8, tableTop + 6, { width: 70 });
  doc.text('Description', col3 + 8, tableTop + 6, { width: 160 });
  doc.text('Amount (Rs.)', col4, tableTop + 6, { width: 80, align: 'right' });
  doc.text('Balance (Rs.)', col5, tableTop + 6, { width: 75, align: 'right' });

  let yPos = tableTop + 20;
  let runningBalance = 0;

  transactions.forEach((txn, index) => {
    if (yPos > 720) {
      doc.addPage();
      doc.fontSize(8).font('Helvetica').fillColor('#6B7280').text(`${customer.name} - Statement of Account`, 40, 25);
      doc.strokeColor('#E5E7EB').lineWidth(0.5).moveTo(40, 36).lineTo(555, 36).stroke();
      yPos = 45;
    }

    if (index % 2 === 0) {
      doc.rect(col1, yPos, 515, 20).fill('#F9FAFB');
    } else {
      doc.rect(col1, yPos, 515, 20).fill('#FFFFFF');
    }

    if (txn.type === 'credit') {
      runningBalance += txn.amount;
    } else {
      runningBalance -= txn.amount;
    }

    const dateStr = new Date(txn.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const isCredit = txn.type === 'credit';
    const typeLabel = isCredit ? 'UDHAR' : 'JAMA';
    const typeColor = isCredit ? '#EF4444' : '#10B981';

    doc.fontSize(8.5).font('Helvetica').fillColor('#374151');
    doc.text(dateStr, col1 + 8, yPos + 6, { width: 80 });

    doc.fillColor(typeColor).font('Helvetica-Bold');
    doc.text(typeLabel, col2 + 8, yPos + 6, { width: 70 });

    doc.fillColor('#374151').font('Helvetica');
    doc.text(txn.description || '-', col3 + 8, yPos + 6, { width: 160, height: 12, ellipsis: true });
    doc.text(txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), col4, yPos + 6, { width: 80, align: 'right' });
    
    const balColor = runningBalance > 0 ? '#EF4444' : (runningBalance < 0 ? '#10B981' : '#374151');
    doc.fillColor(balColor).font('Helvetica-Bold');
    doc.text(Math.abs(runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + (runningBalance > 0 ? ' Dr' : (runningBalance < 0 ? ' Cr' : '')), col5, yPos + 6, { width: 75, align: 'right' });

    yPos += 20;
  });

  if (yPos > 650) {
    doc.addPage();
    yPos = 45;
  }

  const bottomY = yPos + 15;
  doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(40, bottomY).lineTo(555, bottomY).stroke();

  const infoBlockY = bottomY + 15;

  // Left Side: QR Code Card
  doc.roundedRect(40, infoBlockY, 230, 70, 8).fillColor('#FFFFFF').fill();
  doc.roundedRect(40, infoBlockY, 230, 70, 8).strokeColor('#E5E7EB').lineWidth(1).stroke();

  const qrX = 50;
  const qrY = infoBlockY + 10;
  if (qrBuffer) {
    try {
      doc.image(qrBuffer, qrX, qrY, { width: 50, height: 50 });
    } catch (err) {
      console.error('Error drawing real QR code to PDF:', err);
      drawFallbackQR(doc, qrX, qrY);
    }
  } else {
    drawFallbackQR(doc, qrX, qrY);
  }

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#111827').text('Scan to Settle Dues', 112, infoBlockY + 18);
  doc.fontSize(7.5).font('Helvetica').fillColor('#6B7280').text('Scan using any UPI app to make a direct payment to the store owner.', 112, infoBlockY + 30, { width: 145 });

  // Right Side: Summary Card
  doc.roundedRect(285, infoBlockY, 270, 70, 8).fillColor('#FFFFFF').fill();
  doc.roundedRect(285, infoBlockY, 270, 70, 8).strokeColor('#E5E7EB').lineWidth(1).stroke();

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#6B7280').text('FINAL STATEMENT BALANCE', 297, infoBlockY + 10);
  doc.fontSize(18).font('Helvetica-Bold').fillColor(balanceColor).text(`Rs. ${Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 297, infoBlockY + 24);
  
  const badgeLabelText = netBalance > 0 ? 'OVERDUE / PENDING' : 'PAID / IN ADVANCE';
  doc.roundedRect(297, infoBlockY + 46, 120, 14, 4).fillColor(netBalance > 0 ? '#FEF2F2' : '#F0FDF4').fill();
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(balanceColor).text(badgeLabelText, 297, infoBlockY + 50, { width: 120, align: 'center' });

  const pageHeight = doc.page.height;
  const footerY = pageHeight - 50;
  
  doc.strokeColor('#E5E7EB').lineWidth(0.5).moveTo(40, footerY - 5).lineTo(555, footerY - 5).stroke();
  doc.fontSize(8).font('Helvetica').fillColor('#6B7280').text('Generated by Digital Udhar Katha', 40, footerY, { align: 'left', width: 250 });
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 300, footerY, { align: 'right', width: 255 });

  doc.end();
};

const generateStatement = async (store, customer, transactions, dateRange, res) => {
  let qrBuffer = null;
  if (store.upiId && customer.balance > 0) {
    qrBuffer = await getQrCodeBuffer(store.upiId, store.storeName, customer.balance);
  }
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const filename = `statement_${customer.name.replace(/\s+/g, '_')}_${dateRange.startDate}_${dateRange.endDate}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  buildPDFDocument(store, customer, transactions, dateRange, doc, qrBuffer);
};

const generateStatementBuffer = async (store, customer, transactions, dateRange) => {
  let qrBuffer = null;
  if (store.upiId && customer.balance > 0) {
    qrBuffer = await getQrCodeBuffer(store.upiId, store.storeName, customer.balance);
  }
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));
      buildPDFDocument(store, customer, transactions, dateRange, doc, qrBuffer);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate a cashbook statement PDF and stream it to the HTTP response
 * @param {Object} store - Store owner info { storeName, name, phone }
 * @param {Array} entries - Array of cashbook entry objects
 * @param {Object} dateRange - { label, startDate, endDate }
 * @param {Object} res - Express response object
 */
const generateCashbookStatement = (store, entries, dateRange, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const filename = `cashbook_statement_${dateRange.label.replace(/\s+/g, '_')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // ─── TOP HEADER ───
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#111827').text(store.storeName, 40, 40);
  doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`Owner: ${store.name}`, 40, 60);
  if (store.phone) {
    doc.text(`Phone: ${store.phone}`, 40, 72);
  }
  doc.text(`Email: support@digitaludhar.com`, 40, 84);

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#111827').text('CASHBOOK LEDGER', 300, 40, { align: 'right', width: 255 });
  doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text(`Statement Period`, 300, 60, { align: 'right', width: 255 });
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text(dateRange.label, 300, 72, { align: 'right', width: 255 });
  doc.fontSize(8).font('Helvetica').fillColor('#6B7280').text(`Generated: ${new Date().toLocaleString('en-IN')}`, 300, 86, { align: 'right', width: 255 });

  doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(40, 105).lineTo(555, 105).stroke();

  // ─── CARDS SECTION ───
  const cardY = 120;
  const colWidth = 248;
  const cardHeight = 90;

  const totalIn = entries
    .filter((e) => e.type === 'in')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalOut = entries
    .filter((e) => e.type === 'out')
    .reduce((sum, e) => sum + e.amount, 0);
  const cashInHand = totalIn - totalOut;

  // Left Card: Cashbook Summary
  doc.roundedRect(40, cardY, colWidth, cardHeight, 8).fillColor('#F9FAFB').fill();
  doc.roundedRect(40, cardY, colWidth, cardHeight, 8).strokeColor('#E5E7EB').lineWidth(1).stroke();
  doc.rect(40, cardY, 3, cardHeight).fillColor('#111827').fill();

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#6B7280').text('CASHBOOK SUMMARY', 52, cardY + 10);
  doc.fontSize(9).font('Helvetica').fillColor('#374151').text('Total Cash In (Got):', 52, cardY + 24);
  doc.font('Helvetica-Bold').fillColor('#111827').text(`Rs. ${totalIn.toLocaleString('en-IN')}`, 160, cardY + 24, { align: 'right', width: 110 });

  doc.fontSize(9).font('Helvetica').fillColor('#374151').text('Total Cash Out (Paid):', 52, cardY + 38);
  doc.font('Helvetica-Bold').text(`Rs. ${totalOut.toLocaleString('en-IN')}`, 160, cardY + 38, { align: 'right', width: 110 });

  // Right Card: Net Position
  doc.roundedRect(307, cardY, colWidth, cardHeight, 8).fillColor('#F9FAFB').fill();
  doc.roundedRect(307, cardY, colWidth, cardHeight, 8).strokeColor('#E5E7EB').lineWidth(1).stroke();
  doc.rect(307, cardY, 3, cardHeight).fillColor('#111827').fill();

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#6B7280').text('NET POSITION', 319, cardY + 10);
  
  const balanceColor = cashInHand >= 0 ? '#10B981' : '#EF4444';
  doc.roundedRect(314, cardY + 28, 234, 45, 4).fillColor(cashInHand >= 0 ? '#F0FDF4' : '#FEF2F2').fill();
  doc.fontSize(9).font('Helvetica-Bold').fillColor(balanceColor).text('Net Cash in Hand:', 322, cardY + 38);
  doc.fontSize(14).font('Helvetica-Bold').fillColor(balanceColor).text(`Rs. ${cashInHand.toLocaleString('en-IN')}`, 420, cardY + 36, { align: 'right', width: 120 });

  // ─── TRANSACTIONS TABLE ───
  let currentY = 230;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('LEDGER ENTRIES', 40, currentY);

  const tableTop = currentY + 15;
  const col1 = 40;   // Date
  const col2 = 135;  // Mode
  const col3 = 195;  // Remarks
  const col4 = 375;  // Cash In
  const col5 = 465;  // Cash Out

  doc.rect(col1, tableTop, 515, 20).fill('#111827');

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#FFFFFF');
  doc.text('Date & Time', col1 + 8, tableTop + 6, { width: 85 });
  doc.text('Mode', col2 + 8, tableTop + 6, { width: 50 });
  doc.text('Remarks', col3 + 8, tableTop + 6, { width: 170 });
  doc.text('Cash In (Rs.)', col4, tableTop + 6, { width: 80, align: 'right' });
  doc.text('Cash Out (Rs.)', col5, tableTop + 6, { width: 80, align: 'right' });

  let yPos = tableTop + 20;

  entries.forEach((entry, index) => {
    if (yPos > 720) {
      doc.addPage();
      doc.fontSize(8).font('Helvetica').fillColor('#6B7280').text('Cashbook Ledger Daily Statement', 40, 25);
      doc.strokeColor('#E5E7EB').lineWidth(0.5).moveTo(40, 36).lineTo(555, 36).stroke();
      yPos = 45;
    }

    if (index % 2 === 0) {
      doc.rect(col1, yPos, 515, 20).fill('#F9FAFB');
    } else {
      doc.rect(col1, yPos, 515, 20).fill('#FFFFFF');
    }

    const dateStr = new Date(entry.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isCashIn = entry.type === 'in';
    const amountColor = isCashIn ? '#10B981' : '#EF4444';

    doc.fontSize(8.5).font('Helvetica').fillColor('#374151');
    doc.text(dateStr, col1 + 8, yPos + 6, { width: 85 });
    doc.text(entry.paymentMode.toUpperCase(), col2 + 8, yPos + 6, { width: 50 });
    doc.text(entry.description || '-', col3 + 8, yPos + 6, { width: 170, height: 12, ellipsis: true });

    doc.fillColor(isCashIn ? amountColor : '#94A3B8').font(isCashIn ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(isCashIn ? `+${entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-', col4, yPos + 6, { width: 80, align: 'right' });

    doc.fillColor(!isCashIn ? amountColor : '#94A3B8').font(!isCashIn ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(!isCashIn ? `-${entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-', col5, yPos + 6, { width: 80, align: 'right' });

    yPos += 20;
  });

  const pageHeight = doc.page.height;
  const footerY = pageHeight - 50;

  doc.strokeColor('#E5E7EB').lineWidth(0.5).moveTo(40, footerY - 5).lineTo(555, footerY - 5).stroke();
  doc.fontSize(8).font('Helvetica').fillColor('#6B7280').text('Generated by Digital Udhar Katha Cashbook', 40, footerY, { align: 'left', width: 250 });
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 300, footerY, { align: 'right', width: 255 });

  doc.end();
};

const generateReceiptPDFBuffer = async (store, customer, transaction, customerTransactions) => {
  let verifyQrBuffer = null;
  try {
    verifyQrBuffer = await getVerificationQrBuffer(customer._id);
  } catch (err) {
    console.error('Error fetching verification QR buffer:', err);
  }
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // ─── TOP ACCENT STRIPE ───
      doc.rect(0, 0, 595, 8).fill('#111827');

      // ─── LOGO (Left) ───
      doc.rect(40, 25, 20, 26).fill('#111827');
      doc.rect(42, 25, 2, 26).fill('#ffffff');
      doc.rect(54, 29, 3, 2).fill('#ffffff');
      doc.rect(54, 35, 3, 2).fill('#ffffff');
      doc.rect(54, 41, 3, 2).fill('#ffffff');
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('UDHAAR', 66, 28);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#6B7280').text('KHATA', 66, 39);

      // ─── STORE INFO (Center) ───
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#111827').text(store.storeName, 180, 24, { align: 'center', width: 235 });
      doc.fontSize(8).font('Helvetica').fillColor('#6B7280').text('DIGITAL UDHAAR KHATA', 180, 42, { align: 'center', width: 235 });
      doc.fontSize(8).font('Helvetica').fillColor('#475569').text(`Owner: ${store.name}  |  Phone: ${store.phone}`, 180, 52, { align: 'center', width: 235 });

      // ─── SECURED BADGE (Right) ───
      doc.roundedRect(440, 28, 115, 22, 11).fillColor('#F0FDF4').fill();
      doc.roundedRect(440, 28, 115, 22, 11).lineWidth(1).strokeColor('#DCFCE7').stroke();
      doc.circle(452, 39, 4).fillColor('#10B981').fill();
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#166534').text('Secured by Cashfree', 462, 35);

      doc.moveDown(2);
      
      // ─── SUCCESS BANNER ───
      const successY = 75;
      doc.roundedRect(40, successY, 515, 45, 8).fillColor('#F0FDF4').fill();
      doc.roundedRect(40, successY, 515, 45, 8).lineWidth(1).strokeColor('#BBF7D0').stroke();
      
      doc.circle(65, successY + 22, 10).fillColor('#10B981').fill();
      doc.circle(65, successY + 22, 10).lineWidth(1.5).strokeColor('#ffffff').stroke();
      
      doc.lineCap('round').lineWidth(2).strokeColor('#ffffff')
        .moveTo(61, successY + 22)
        .lineTo(64, successY + 25)
        .lineTo(70, successY + 19)
        .stroke();

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#166534').text('Payment Successful', 85, successY + 10);
      doc.fontSize(9).font('Helvetica').fillColor('#15803D').text('Thank you for your payment.', 85, successY + 24);

      // ─── RECEIPT METADATA ROW ───
      const metaY = 132;
      doc.roundedRect(40, metaY, 515, 38, 8).fillColor('#F9FAFB').fill();
      doc.roundedRect(40, metaY, 515, 38, 8).lineWidth(1).strokeColor('#E5E7EB').stroke();

      doc.lineWidth(1).strokeColor('#E5E7EB')
        .moveTo(168, metaY).lineTo(168, metaY + 38)
        .moveTo(296, metaY).lineTo(296, metaY + 38)
        .moveTo(424, metaY).lineTo(424, metaY + 38)
        .stroke();

      const dateObj = new Date(transaction.date);
      const receiptNo = `RCP-${dateObj.getFullYear()}${(dateObj.getMonth()+1).toString().padStart(2,'0')}${dateObj.getDate().toString().padStart(2,'0')}-${customer._id.toString().slice(-3).toUpperCase()}`;
      const paymentDate = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const paymentTime = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#6B7280');
      doc.text('RECEIPT NO.', 45, metaY + 8, { width: 118, align: 'center' });
      doc.text('DATE', 173, metaY + 8, { width: 118, align: 'center' });
      doc.text('TIME', 301, metaY + 8, { width: 118, align: 'center' });
      doc.text('GENERATED ON', 429, metaY + 8, { width: 120, align: 'center' });

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#111827');
      doc.text(receiptNo, 45, metaY + 20, { width: 118, align: 'center' });
      doc.text(paymentDate, 173, metaY + 20, { width: 118, align: 'center' });
      doc.text(paymentTime, 301, metaY + 20, { width: 118, align: 'center' });
      doc.text(paymentDate, 429, metaY + 20, { width: 120, align: 'center' });

      // ─── CUSTOMER DETAILS CARD ───
      const custY = 182;
      doc.roundedRect(40, custY, 515, 65, 8).fillColor('#FFFFFF').fill();
      doc.roundedRect(40, custY, 515, 65, 8).lineWidth(1).strokeColor('#E5E7EB').stroke();
      doc.rect(40, custY, 3, 65).fillColor('#111827').fill();

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#6B7280').text('CUSTOMER DETAILS', 52, custY + 8);
      
      doc.fontSize(9).font('Helvetica').fillColor('#6B7280');
      doc.text('Name', 52, custY + 24);
      doc.text('Phone', 52, custY + 36);
      doc.text('Address', 52, custY + 48);

      doc.font('Helvetica-Bold').fillColor('#111827');
      doc.text(`:  ${customer.name}`, 105, custY + 24);
      doc.text(`:  ${customer.phone}`, 105, custY + 36);
      doc.text(`:  ${customer.address || 'Not specified'}`, 105, custY + 48);

      const avatarX = 500;
      const avatarY = custY + 15;
      doc.circle(avatarX + 17, avatarY + 17, 17).fillColor('#F3F4F6').fill();
      doc.circle(avatarX + 17, avatarY + 17, 17).lineWidth(1).strokeColor('#E5E7EB').stroke();
      const initial = customer.name ? customer.name.charAt(0).toUpperCase() : 'C';
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827').text(initial, avatarX, avatarY + 11, { width: 34, align: 'center' });

      // ─── TWO CARD SECTION ───
      const cardY = 260;
      const cardW = 248;
      const cardH = 120;

      // Card 1: Payment Details
      doc.roundedRect(40, cardY, cardW, cardH, 8).fillColor('#FFFFFF').fill();
      doc.roundedRect(40, cardY, cardW, cardH, 8).lineWidth(1).strokeColor('#E5E7EB').stroke();
      doc.rect(40, cardY, 3, cardH).fillColor('#111827').fill();

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#6B7280').text('PAYMENT DETAILS', 50, cardY + 8);
      
      doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text('Amount Paid', 50, cardY + 24);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#10B981').text(`Rs. ${transaction.amount.toFixed(2)}`, 160, cardY + 22, { align: 'right', width: 118 });

      doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text('Payment Method', 50, cardY + 38);
      doc.font('Helvetica-Bold').fillColor('#111827').text(transaction.paymentMode ? transaction.paymentMode.toUpperCase() : 'UPI', 160, cardY + 38, { align: 'right', width: 118 });

      doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text('Payment Status', 50, cardY + 52);
      doc.roundedRect(210, cardY + 50, 48, 12, 6).fillColor('#F0FDF4').fill();
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#166534').text('SUCCESS', 210, cardY + 53, { width: 48, align: 'center' });

      doc.lineWidth(1).strokeColor('#F3F4F6').moveTo(50, cardY + 70).lineTo(278, cardY + 70).stroke();

      let utrVal = transaction.utr || '';
      if (!utrVal && transaction.description) {
        const match = transaction.description.match(/UTR:\s*(\d+)/i);
        if (match) utrVal = match[1];
      }
      if (!utrVal) utrVal = transaction._id.toString().slice(-12).toUpperCase();

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#94A3B8').text('TRANSACTION ID (UTR)', 50, cardY + 78);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569').text(utrVal, 50, cardY + 88);

      // Card 2: Khata Summary
      doc.roundedRect(307, cardY, cardW, cardH, 8).fillColor('#FFFFFF').fill();
      doc.roundedRect(307, cardY, cardW, cardH, 8).lineWidth(1).strokeColor('#E5E7EB').stroke();
      doc.rect(307, cardY, 3, cardH).fillColor('#111827').fill();

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#6B7280').text('KHATA SUMMARY', 317, cardY + 8);

      const totalUdhaarVal = customerTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
      const totalJamaVal = customerTransactions.filter(t => t.type === 'debit' && t.paymentStatus !== 'FAILED').reduce((sum, t) => sum + t.amount, 0);

      doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text('Total You Gave', 317, cardY + 24);
      doc.font('Helvetica-Bold').fillColor('#111827').text(`Rs. ${totalUdhaarVal.toFixed(2)}`, 427, cardY + 24, { align: 'right', width: 118 });

      doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text('Total You Got', 317, cardY + 38);
      doc.font('Helvetica-Bold').text(`Rs. ${totalJamaVal.toFixed(2)}`, 427, cardY + 38, { align: 'right', width: 118 });

      doc.lineWidth(1).strokeColor('#F3F4F6').moveTo(317, cardY + 70).lineTo(545, cardY + 70).stroke();

      const finalBalanceVal = customer.balance;
      const balanceLabel = finalBalanceVal <= 0 ? '(Advance)' : '(Due)';
      const summaryBalColor = finalBalanceVal <= 0 ? '#10B981' : '#EF4444';

      doc.fontSize(9).font('Helvetica-Bold').fillColor(summaryBalColor).text('Net Balance', 317, cardY + 78);
      doc.fontSize(7).font('Helvetica-Bold').fillColor(summaryBalColor).text(balanceLabel, 317, cardY + 88);
      doc.fontSize(16).font('Helvetica-Bold').fillColor(summaryBalColor).text(`Rs. ${finalBalanceVal.toFixed(2)}`, 427, cardY + 78, { align: 'right', width: 118 });

      // ─── TRANSACTION TIMELINE ───
      const timelineY = 390;
      doc.roundedRect(40, timelineY, 515, 110, 8).fillColor('#FFFFFF').fill();
      doc.roundedRect(40, timelineY, 515, 110, 8).lineWidth(1).strokeColor('#E5E7EB').stroke();
      doc.rect(40, timelineY, 3, 110).fillColor('#111827').fill();

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#6B7280').text('TRANSACTION TIMELINE', 50, timelineY + 8);

      const timelineTxns = customerTransactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
      timelineTxns.reverse();

      let rowY = timelineY + 26;
      timelineTxns.forEach((txn, idx) => {
        const txnDateStr = new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const txnTimeStr = new Date(txn.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const isCreditTxn = txn.type === 'credit';
        const dotColor = isCreditTxn ? '#EF4444' : '#10B981';
        const textColor = isCreditTxn ? '#EF4444' : '#10B981';

        let txnTitle = isCreditTxn ? 'You Added (Udhar)' : 'You Received (Jama)';
        let txnSubtitle = '';
        if (isCreditTxn) {
          txnSubtitle = txn.description || 'Goods purchased on credit';
        } else {
          let txnUtr = '';
          const m = (txn.description || '').match(/UTR:\s*(\d+)/i);
          if (m) txnUtr = m[1];
          txnSubtitle = txnUtr ? `UTR: ${txnUtr}` : (txn.description || 'Payment received');
        }

        doc.circle(55, rowY + 5, 3).fillColor(dotColor).fill();
        
        if (idx < timelineTxns.length - 1) {
          doc.lineWidth(1).strokeColor('#E5E7EB')
            .moveTo(55, rowY + 8).lineTo(55, rowY + 22)
            .stroke();
        }

        doc.fontSize(8).font('Helvetica-Bold').fillColor('#6B7280');
        doc.text(`${txnDateStr}  ${txnTimeStr}`, 70, rowY);

        doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155');
        doc.text(txnTitle, 180, rowY);
        doc.fontSize(7).font('Helvetica').fillColor('#94A3B8').text(txnSubtitle, 180, rowY + 9);

        doc.fontSize(9).font('Helvetica-Bold').fillColor(textColor);
        doc.text(`Rs. ${txn.amount.toFixed(2)}`, 427, rowY, { align: 'right', width: 118 });

        rowY += 24;
      });

      // ─── FOOTER SECTION ───
      const footerY = 515;
      doc.lineWidth(1).strokeColor('#E5E7EB').moveTo(40, footerY).lineTo(555, footerY).stroke();

      if (verifyQrBuffer) {
        try {
          doc.image(verifyQrBuffer, 40, footerY + 12, { width: 45, height: 45 });
        } catch (err) {
          console.error('Error drawing verification QR to receipt PDF:', err);
          doc.rect(40, footerY + 12, 45, 45).fillColor('#F9FAFB').fill();
          doc.rect(40, footerY + 12, 45, 45).lineWidth(1).strokeColor('#cbd5e1').stroke();
          doc.rect(44, footerY + 16, 12, 12).fillColor('#111827').fill();
          doc.rect(69, footerY + 16, 12, 12).fillColor('#111827').fill();
          doc.rect(44, footerY + 41, 12, 12).fillColor('#111827').fill();
          doc.rect(59, footerY + 29, 6, 6).fillColor('#111827').fill();
          doc.rect(69, footerY + 41, 6, 6).fillColor('#111827').fill();
        }
      } else {
        doc.rect(40, footerY + 12, 45, 45).fillColor('#F9FAFB').fill();
        doc.rect(40, footerY + 12, 45, 45).lineWidth(1).strokeColor('#cbd5e1').stroke();
        doc.rect(44, footerY + 16, 12, 12).fillColor('#111827').fill();
        doc.rect(69, footerY + 16, 12, 12).fillColor('#111827').fill();
        doc.rect(44, footerY + 41, 12, 12).fillColor('#111827').fill();
        doc.rect(59, footerY + 29, 6, 6).fillColor('#111827').fill();
        doc.rect(69, footerY + 41, 6, 6).fillColor('#111827').fill();
      }

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#111827').text('Scan to Verify', 95, footerY + 18);
      doc.fontSize(7).font('Helvetica').fillColor('#6B7280').text(`Receipt No: ${receiptNo}`, 95, footerY + 30);

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#111827').text('Need Help?', 420, footerY + 14, { align: 'right', width: 135 });
      doc.fontSize(7).font('Helvetica').fillColor('#475569');
      doc.text(`Owner: ${store.name}`, 420, footerY + 25, { align: 'right', width: 135 });
      doc.text(`Phone: ${store.phone}`, 420, footerY + 35, { align: 'right', width: 135 });
      doc.text('Email: support@udhaarkhata.com', 420, footerY + 45, { align: 'right', width: 135 });

      const discY = footerY + 70;
      doc.lineWidth(1).strokeColor('#F3F4F6').moveTo(40, discY).lineTo(555, discY).stroke();
      
      doc.fontSize(7).font('Helvetica').fillColor('#94a3b8').text('This is a computer generated receipt and does not require any signature.', 40, discY + 8, { align: 'center', width: 515 });
      doc.fontSize(6).font('Helvetica').fillColor('#94a3b8').text('Powered by Digital Udhaar Khata  |  Secured by Cashfree Payments', 40, discY + 18, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateStatement, generateCashbookStatement, generateStatementBuffer, generateReceiptPDFBuffer };
