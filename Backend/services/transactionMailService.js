const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { sendEmail } = require('./mailService');
const { generateStatementBuffer, generateReceiptPDFBuffer } = require('./pdfService');

/**
 * Send a bill email for credit (Udhaar) transactions or a payment confirmation email for debit (Jama) transactions.
 */
const sendTransactionEmail = async (transactionId) => {
  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) return;

    const customer = await Customer.findById(transaction.customer);
    const owner = await User.findById(transaction.owner);

    if (!customer || !owner || !customer.email) {
      return;
    }

    const storeName = owner.storeName || 'Digital Udhaar';
    const customerFirstName = customer.name ? customer.name.split(' ')[0] : 'Valued Customer';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const dateStr = new Date(transaction.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (transaction.type === 'credit' && transaction.paymentStatus !== 'SETTLED') {
      // ─── NEW PURCHASE BILL (YOU GAVE) ───
      // Fetch customer transactions to calculate total credit/debit and build timeline
      let customerTransactions = [];
      let totalUdhaarVal = transaction.amount;
      let totalJamaVal = 0;
      let timelineHtml = '';

      try {
        customerTransactions = await Transaction.find({ customer: customer._id });
        totalUdhaarVal = customerTransactions
          .filter(t => t.type === 'credit')
          .reduce((sum, t) => sum + t.amount, 0);
        
        totalJamaVal = customerTransactions
          .filter(t => t.type === 'debit' && t.paymentStatus !== 'FAILED')
          .reduce((sum, t) => sum + t.amount, 0);

        // Build recent timeline html (last 3 transactions)
        const timelineTxns = customerTransactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
        timelineTxns.reverse();

        timelineTxns.forEach((txn, idx) => {
          const txnDateStr = new Date(txn.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
          const txnTimeStr = new Date(txn.date).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          const isCreditTxn = txn.type === 'credit';
          const dotColor = isCreditTxn ? '#f97316' : '#10b981';
          const textColor = isCreditTxn ? '#ef4444' : '#10b981';
          
          const txnTitle = isCreditTxn ? 'You Gave Added' : 'You Got Received via UPI';
          let txnSubtitle = '';
          if (isCreditTxn) {
            txnSubtitle = txn.description || 'Goods purchased on credit';
          } else {
            let txnUtr = '';
            const m = (txn.description || '').match(/UTR:\s*(\d+)/i);
            if (m) txnUtr = m[1];
            txnSubtitle = txnUtr ? `UTR: ${txnUtr}` : (txn.description || 'Payment received');
          }

          const isLast = idx === timelineTxns.length - 1;
          const lineHtml = isLast ? '' : `<div style="width: 2px; background-color: #e2e8f0; position: absolute; top: 12px; bottom: 0; left: 5px;"></div>`;

          timelineHtml += `
            <tr>
              <td style="width: 12px; vertical-align: top; padding-bottom: 14px; position: relative; text-align: center;">
                <div style="width: 8px; height: 8px; background-color: ${dotColor}; border-radius: 50%; margin: 4px auto 0 auto;"></div>
                ${lineHtml}
              </td>
              <td style="padding-left: 10px; vertical-align: top; padding-bottom: 14px; width: 110px; color: #64748b; font-weight: bold;">
                ${txnDateStr}<br /><span style="font-size: 9px; font-weight: 600;">${txnTimeStr}</span>
              </td>
              <td style="padding-left: 10px; vertical-align: top; padding-bottom: 14px; color: #334155; font-weight: bold;">
                ${txnTitle}<br />
                <span style="font-size: 9px; color: #94a3b8; font-weight: 600;">${txnSubtitle}</span>
              </td>
              <td style="vertical-align: top; padding-bottom: 14px; text-align: right; color: ${textColor}; font-weight: 900;">
                ₹${txn.amount.toFixed(2)}
              </td>
            </tr>
          `;
        });
      } catch (err) {
        console.error('Error fetching transactions for credit email timeline:', err.message);
      }

      const finalBalanceVal = customer.balance;
      const balanceLabel = finalBalanceVal <= 0 ? '(Advance)' : '(Due)';
      const balanceColor = finalBalanceVal <= 0 ? '#10b981' : '#ef4444';

      const billDateObj = new Date(transaction.date);
      const invoiceNo = `INV-${billDateObj.getFullYear()}${(billDateObj.getMonth()+1).toString().padStart(2,'0')}${billDateObj.getDate().toString().padStart(2,'0')}-${customer._id.toString().slice(-3).toUpperCase()}`;
      
      const paymentDate = billDateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const paymentTime = billDateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const customerName = customer.name || 'Valued Customer';
      const customerPhone = customer.phone || 'Not specified';
      const customerAddress = customer.address || 'Not specified';
      const customerInitial = customerName.charAt(0).toUpperCase();

      const textMessage = `Namaste ${customerFirstName}!\n\nThis is an automated bill notification from KathaGPT.\n\nA new purchase has been recorded on your account at ${storeName}.\n\nBill Details:\n- Amount: ₹${transaction.amount.toFixed(2)}\n- Purchased Products: ${transaction.description || 'Not specified'}\n- Date: ${dateStr}\n\nYour total outstanding balance is now ₹${customer.balance.toFixed(2)}.\n\nYou can view your statement or pay online here: ${frontendUrl}/pay/${customer._id}\n\nThank you!\nKathaGPT`;

      const htmlMessage = `
        <div style="background-color: #f1f5f9; padding: 24px 12px; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
            <!-- Top orange stripe -->
            <div style="height: 6px; background-color: #f97316;"></div>
            
            <div style="padding: 24px;">
              <!-- Header -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <!-- Logo -->
                  <td style="vertical-align: middle; width: 120px;">
                    <table style="border-collapse: collapse;">
                      <tr>
                        <td style="background-color: #f97316; width: 24px; height: 32px; border-top-left-radius: 4px; border-bottom-left-radius: 4px; position: relative; text-align: center; vertical-align: middle;">
                          <span style="color: #ffffff; font-weight: bold; font-size: 14px;">U</span>
                        </td>
                        <td style="padding-left: 6px; line-height: 1.1;">
                          <span style="color: #f97316; font-weight: 900; font-size: 11px; display: block; text-transform: uppercase; letter-spacing: -0.5px;">Udhaar</span>
                          <span style="color: #1e293b; font-weight: 900; font-size: 11px; display: block; text-transform: uppercase; letter-spacing: -0.5px;">Khata</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Store Details -->
                  <td style="text-align: center; vertical-align: middle;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">${storeName}</h1>
                    <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Digital Udhaar Khata</p>
                    <p style="margin: 4px 0 0 0; font-size: 10px; color: #475569; font-weight: 600;">Owner: ${owner.name} &nbsp;|&nbsp; Phone: ${owner.phone}</p>
                  </td>
                  <!-- Secured Badge -->
                  <td style="text-align: right; vertical-align: middle; width: 140px;">
                    <div style="display: inline-block; padding: 6px 12px; background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 20px; color: #065f46; font-size: 9px; font-weight: bold;">
                      <span style="display: inline-block; width: 6px; height: 6px; background-color: #10b981; border-radius: 50%; margin-right: 4px; vertical-align: middle;"></span>
                      Secured by Cashfree
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Action Banner -->
              <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 16px; padding: 16px; text-align: center; margin-bottom: 20px;">
                <img src="https://img.icons8.com/fluency/48/invoice.png" width="24" height="24" style="vertical-align: middle; margin-bottom: 4px;" />
                <h2 style="margin: 4px 0 0 0; color: #c2410c; font-size: 16px; font-weight: 900; letter-spacing: -0.3px;">New Purchase Recorded</h2>
                <p style="margin: 2px 0 0 0; color: #ea580c; font-size: 11px; font-weight: 600;">You Gave (Credit) transaction has been added.</p>
              </div>

              <!-- Metadata -->
              <table style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 20px; font-size: 11px;">
                <tr>
                  <td style="padding: 12px; text-align: center; border-right: 1px solid #e2e8f0; width: 25%;">
                    <span style="color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px;">Invoice No.</span>
                    <span style="color: #1e293b; font-weight: 800;">${invoiceNo}</span>
                  </td>
                  <td style="padding: 12px; text-align: center; border-right: 1px solid #e2e8f0; width: 25%;">
                    <span style="color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px;">Date</span>
                    <span style="color: #1e293b; font-weight: 800;">${paymentDate}</span>
                  </td>
                  <td style="padding: 12px; text-align: center; border-right: 1px solid #e2e8f0; width: 25%;">
                    <span style="color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px;">Time</span>
                    <span style="color: #1e293b; font-weight: 800;">${paymentTime}</span>
                  </td>
                  <td style="padding: 12px; text-align: center; width: 25%;">
                    <span style="color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px;">Generated On</span>
                    <span style="color: #1e293b; font-weight: 800;">${paymentDate}</span>
                  </td>
                </tr>
              </table>

              <!-- Customer Details -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="vertical-align: top;">
                      <div style="margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                        <span style="color: #4f46e5; font-weight: 900; font-size: 11px; text-transform: uppercase;">Customer Details</span>
                      </div>
                      <table style="width: 100%; border-collapse: collapse; font-size: 12px; line-height: 1.6;">
                        <tr>
                          <td style="color: #64748b; font-weight: bold; width: 65px; padding: 2px 0;">Name</td>
                          <td style="color: #1e293b; font-weight: 800; padding: 2px 0;">: ${customerName}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: bold; padding: 2px 0;">Phone</td>
                          <td style="color: #1e293b; font-weight: 800; padding: 2px 0;">: ${customerPhone}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: bold; padding: 2px 0;">Address</td>
                          <td style="color: #1e293b; font-weight: 800; padding: 2px 0;">: ${customerAddress}</td>
                        </tr>
                      </table>
                    </td>
                    <td style="vertical-align: middle; text-align: right; width: 70px;">
                      <div style="width: 52px; height: 52px; background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 50%; display: inline-block; text-align: center; line-height: 52px; font-weight: 950; font-size: 20px; color: #f43f5e;">
                        ${customerInitial}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Two column detail cards -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <!-- Left side: Bill Details -->
                  <td style="width: 48%; vertical-align: top; padding-right: 8px;">
                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; min-height: 140px;">
                      <div style="color: #4f46e5; font-weight: 900; font-size: 10px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">Bill Details</div>
                      <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.8;">
                        <tr>
                          <td style="color: #64748b; font-weight: 600;">Bill Amount</td>
                          <td style="text-align: right; color: #ef4444; font-weight: 900; font-size: 12px;">₹${transaction.amount.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: 600;">Items</td>
                          <td style="text-align: right; color: #1e293b; font-weight: 800; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${transaction.description || 'General Items'}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: 600;">Status</td>
                          <td style="text-align: right;">
                            <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; font-size: 8px; font-weight: bold; padding: 2px 6px; border-radius: 10px; text-transform: uppercase;">UNPAID</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                  <!-- Right side: Khata Summary -->
                  <td style="width: 48%; vertical-align: top; padding-left: 8px;">
                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; min-height: 140px; display: flex; flex-direction: column; justify-content: space-between;">
                      <div>
                        <div style="color: #4f46e5; font-weight: 900; font-size: 10px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">Khata Summary</div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.8;">
                          <tr>
                            <td style="color: #64748b; font-weight: 600;">Total You Gave</td>
                            <td style="text-align: right; color: #1e293b; font-weight: bold;">₹${totalUdhaarVal.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style="color: #64748b; font-weight: 600;">Total You Got</td>
                            <td style="text-align: right; color: #1e293b; font-weight: bold;">₹${totalJamaVal.toFixed(2)}</td>
                          </tr>
                        </table>
                      </div>
                      <div style="border-top: 1px solid #f1f5f9; margin-top: 8px; padding-top: 8px; display: table; width: 100%;">
                        <div style="display: table-cell; vertical-align: middle;">
                          <span style="font-size: 11px; font-weight: 900; color: ${balanceColor}; display: block; line-height: 1.1;">Net Balance</span>
                          <span style="font-size: 8px; color: ${balanceColor}; font-weight: bold; display: block;">${balanceLabel}</span>
                        </div>
                        <div style="display: table-cell; text-align: right; vertical-align: middle; font-size: 16px; font-weight: 950; color: ${balanceColor};">
                          ₹${finalBalanceVal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Timeline -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-bottom: 20px;">
                <div style="color: #4f46e5; font-weight: 900; font-size: 11px; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">Transaction Timeline</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                  ${timelineHtml ? timelineHtml : '<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 10px;">No transactions recorded</td></tr>'}
                </table>
              </div>

              <!-- Payment Link CTA -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${frontendUrl}/pay/${customer._id}" 
                   style="background-color: #ef4444; color: #ffffff; padding: 14px 32px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);">
                   <img src="https://img.icons8.com/ios-filled/50/ffffff/credit-card.png" width="16" height="12" style="vertical-align: middle; margin-right: 8px; margin-bottom: 2px;" />Pay Bill Now
                </a>
              </div>

              <!-- Footer Info -->
              <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 11px;">
                <tr>
                  <!-- Scan To Verify -->
                  <td style="vertical-align: middle;">
                    <table style="border-collapse: collapse;">
                      <tr>
                        <td>
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(frontendUrl + '/pay/' + customer._id)}" width="50" height="50" style="border: 1px solid #cbd5e1; padding: 2px; border-radius: 6px;" />
                        </td>
                        <td style="padding-left: 8px; text-align: left; vertical-align: middle;">
                          <h4 style="margin: 0; font-size: 11px; font-weight: 900; color: #1e293b;">Scan to Pay / View</h4>
                          <p style="margin: 2px 0 0 0; font-size: 9px; color: #64748b; font-weight: bold;">Bill Ref: ${invoiceNo}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Need Help -->
                  <td style="text-align: right; vertical-align: middle; color: #475569; font-weight: bold; font-size: 10px; line-height: 1.5;">
                    <h4 style="margin: 0 0 2px 0; font-size: 11px; font-weight: 900; color: #1e293b;">Need Help?</h4>
                    Owner: ${owner.name} | Phone: ${owner.phone}<br />
                    Email: support@udhaarkhata.com
                  </td>
                </tr>
              </table>

              <!-- Disclaimer -->
              <div style="border-top: 1px solid #f1f5f9; margin-top: 20px; padding-top: 12px; text-align: center; font-size: 9px; color: #94a3b8; font-weight: 600;">
                This is an automated billing invoice generated by Digital Udhaar Khata.
              </div>
            </div>
          </div>
        </div>
      `;

      // Generate PDF statement to attach
      let pdfAttachment = null;
      try {
        const allTxns = await Transaction.find({ customer: customer._id }).sort({ date: 1 });
        const startDate = allTxns.length > 0
          ? new Date(allTxns[0].date).toLocaleDateString('en-IN')
          : new Date().toLocaleDateString('en-IN');
        const endDate = new Date().toLocaleDateString('en-IN');

        const store = {
          storeName,
          name: owner.name || 'Merchant',
          phone: owner.phone || '',
        };

        const pdfBuffer = await generateStatementBuffer(store, customer, allTxns, {
          startDate,
          endDate,
          label: `Statement as of ${endDate}`,
        });

        pdfAttachment = {
          filename: `statement_${customer.name.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
        };
      } catch (pdfErr) {
        console.error('Failed to generate statement PDF for bill email:', pdfErr.message);
      }

      await sendEmail({
        to: customer.email,
        subject: `New Purchase Bill - ${storeName}`,
        text: textMessage,
        html: htmlMessage,
        attachments: pdfAttachment ? [pdfAttachment] : [],
      });

      console.log(`🤖 KathaGPT sent bill invoice${pdfAttachment ? ' + statement PDF' : ''} for credit txn to ${customer.name}`);
    } else {
      // ─── DEBIT TRANSACTION (PAYMENT RECEIVED) ───
      const dateObj = new Date(transaction.date);
      const receiptNo = `RCP-${dateObj.getFullYear()}${(dateObj.getMonth()+1).toString().padStart(2,'0')}${dateObj.getDate().toString().padStart(2,'0')}-${customer._id.toString().slice(-3).toUpperCase()}`;
      
      const paymentDate = dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const paymentTime = dateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const customerName = customer.name || 'Valued Customer';
      const customerPhone = customer.phone || 'Not specified';
      const customerAddress = customer.address || 'Not specified';
      const customerInitial = customerName.charAt(0).toUpperCase();

      const amountVal = transaction.amount;
      const paymentMethod = transaction.paymentMode ? transaction.paymentMode.toUpperCase() : 'UPI';
      const statusText = transaction.paymentStatus || 'SUCCESS';

      let utrVal = transaction.utr || '';
      if (!utrVal && transaction.description) {
        const match = transaction.description.match(/UTR:\s*(\d+)/i);
        if (match) {
          utrVal = match[1];
        }
      }
      if (!utrVal) {
        utrVal = transaction._id.toString().slice(-12).toUpperCase();
      }

      // Fetch customer transactions to calculate total credit/debit and build timeline
      const customerTransactions = await Transaction.find({ customer: customer._id });
      
      const totalUdhaarVal = customerTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalJamaVal = customerTransactions
        .filter(t => t.type === 'debit' && t.paymentStatus !== 'FAILED')
        .reduce((sum, t) => sum + t.amount, 0);

      const finalBalanceVal = customer.balance;
      const balanceLabel = finalBalanceVal <= 0 ? '(Advance)' : '(Due)';
      const balanceColor = finalBalanceVal <= 0 ? '#10b981' : '#f97316';

      // Build recent timeline html (last 3 transactions)
      const timelineTxns = customerTransactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
      timelineTxns.reverse();

      let timelineHtml = '';
      timelineTxns.forEach((txn, idx) => {
        const txnDateStr = new Date(txn.date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const txnTimeStr = new Date(txn.date).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        const isCreditTxn = txn.type === 'credit';
        const dotColor = isCreditTxn ? '#f97316' : '#10b981';
        const textColor = isCreditTxn ? '#ef4444' : '#10b981';
        
        let txnTitle = isCreditTxn ? 'You Gave Added' : 'You Got Received via UPI';
        let txnSubtitle = '';
        if (isCreditTxn) {
          txnSubtitle = txn.description || 'Goods purchased on credit';
        } else {
          let txnUtr = '';
          const m = (txn.description || '').match(/UTR:\s*(\d+)/i);
          if (m) txnUtr = m[1];
          txnSubtitle = txnUtr ? `UTR: ${txnUtr}` : (txn.description || 'Payment received');
        }

        const isLast = idx === timelineTxns.length - 1;
        const lineHtml = isLast ? '' : `<div style="width: 2px; background-color: #e2e8f0; position: absolute; top: 12px; bottom: 0; left: 5px;"></div>`;

        timelineHtml += `
          <tr>
            <td style="width: 12px; vertical-align: top; padding-bottom: 14px; position: relative; text-align: center;">
              <div style="width: 8px; height: 8px; background-color: ${dotColor}; border-radius: 50%; margin: 4px auto 0 auto;"></div>
              ${lineHtml}
            </td>
            <td style="padding-left: 10px; vertical-align: top; padding-bottom: 14px; width: 110px; color: #64748b; font-weight: bold;">
              ${txnDateStr}<br /><span style="font-size: 9px; font-weight: 600;">${txnTimeStr}</span>
            </td>
            <td style="padding-left: 10px; vertical-align: top; padding-bottom: 14px; color: #334155; font-weight: bold;">
              ${txnTitle}<br />
              <span style="font-size: 9px; color: #94a3b8; font-weight: 600;">${txnSubtitle}</span>
            </td>
            <td style="vertical-align: top; padding-bottom: 14px; text-align: right; color: ${textColor}; font-weight: 900;">
              ₹${txn.amount.toFixed(2)}
            </td>
          </tr>
        `;
      });

      // Generate the premium PDF receipt buffer
      const pdfBuffer = await generateReceiptPDFBuffer(
        { storeName, name: owner.name, phone: owner.phone, upiId: owner.upiId || '' },
        customer,
        transaction,
        customerTransactions
      );

      const textMessage = `Namaste ${customerFirstName}!\n\nThis is an automated notification from KathaGPT.\n\nWe have successfully received your payment of ₹${amountVal.toFixed(2)} at ${storeName}.\n\nPayment Details:\n- Amount: ₹${amountVal.toFixed(2)}\n- UTR / Ref No: ${utrVal}\n- Date: ${paymentDate} ${paymentTime}\n\nYour remaining outstanding balance is ₹${finalBalanceVal.toFixed(2)} ${balanceLabel}.\n\nA detailed copy of your payment receipt is attached to this email as a PDF.\n\nThank you for your payment!\nKathaGPT`;

      const htmlMessage = `
        <div style="background-color: #f1f5f9; padding: 24px 12px; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
            <!-- Top red stripe -->
            <div style="height: 6px; background-color: #ef4444;"></div>
            
            <div style="padding: 24px;">
              <!-- Header -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <!-- Logo -->
                  <td style="vertical-align: middle; width: 120px;">
                    <table style="border-collapse: collapse;">
                      <tr>
                        <td style="background-color: #ef4444; width: 24px; height: 32px; border-top-left-radius: 4px; border-bottom-left-radius: 4px; position: relative; text-align: center; vertical-align: middle;">
                          <span style="color: #ffffff; font-weight: bold; font-size: 14px;">U</span>
                        </td>
                        <td style="padding-left: 6px; line-height: 1.1;">
                          <span style="color: #ef4444; font-weight: 900; font-size: 11px; display: block; text-transform: uppercase; letter-spacing: -0.5px;">Udhaar</span>
                          <span style="color: #1e293b; font-weight: 900; font-size: 11px; display: block; text-transform: uppercase; letter-spacing: -0.5px;">Khata</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Store Details -->
                  <td style="text-align: center; vertical-align: middle;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">${storeName}</h1>
                    <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Digital Udhaar Khata</p>
                    <p style="margin: 4px 0 0 0; font-size: 10px; color: #475569; font-weight: 600;">Owner: ${owner.name} &nbsp;|&nbsp; Phone: ${owner.phone}</p>
                  </td>
                  <!-- Secured Badge -->
                  <td style="text-align: right; vertical-align: middle; width: 140px;">
                    <div style="display: inline-block; padding: 6px 12px; background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 20px; color: #065f46; font-size: 9px; font-weight: bold;">
                      <span style="display: inline-block; width: 6px; height: 6px; background-color: #10b981; border-radius: 50%; margin-right: 4px; vertical-align: middle;"></span>
                      Secured by Cashfree
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Success Banner -->
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 16px; padding: 16px; text-align: center; margin-bottom: 20px;">
                <img src="https://img.icons8.com/fluency/48/ok.png" width="24" height="24" style="vertical-align: middle; margin-bottom: 4px;" />
                <h2 style="margin: 4px 0 0 0; color: #065f46; font-size: 16px; font-weight: 900; letter-spacing: -0.3px;">Payment Successful!</h2>
                <p style="margin: 2px 0 0 0; color: #047857; font-size: 11px; font-weight: 600;">Thank you for your payment.</p>
              </div>

              <!-- Receipt Metadata -->
              <table style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 20px; font-size: 11px;">
                <tr>
                  <td style="padding: 12px; text-align: center; border-right: 1px solid #e2e8f0; width: 25%;">
                    <span style="color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px;">Receipt No.</span>
                    <span style="color: #1e293b; font-weight: 800;">${receiptNo}</span>
                  </td>
                  <td style="padding: 12px; text-align: center; border-right: 1px solid #e2e8f0; width: 25%;">
                    <span style="color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px;">Date</span>
                    <span style="color: #1e293b; font-weight: 800;">${paymentDate}</span>
                  </td>
                  <td style="padding: 12px; text-align: center; border-right: 1px solid #e2e8f0; width: 25%;">
                    <span style="color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px;">Time</span>
                    <span style="color: #1e293b; font-weight: 800;">${paymentTime}</span>
                  </td>
                  <td style="padding: 12px; text-align: center; width: 25%;">
                    <span style="color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px;">Generated On</span>
                    <span style="color: #1e293b; font-weight: 800;">${paymentDate}</span>
                  </td>
                </tr>
              </table>

              <!-- Customer Details -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="vertical-align: top;">
                      <div style="margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                        <span style="color: #4f46e5; font-weight: 900; font-size: 11px; text-transform: uppercase;">Customer Details</span>
                      </div>
                      <table style="width: 100%; border-collapse: collapse; font-size: 12px; line-height: 1.6;">
                        <tr>
                          <td style="color: #64748b; font-weight: bold; width: 65px; padding: 2px 0;">Name</td>
                          <td style="color: #1e293b; font-weight: 800; padding: 2px 0;">: ${customerName}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: bold; padding: 2px 0;">Phone</td>
                          <td style="color: #1e293b; font-weight: 800; padding: 2px 0;">: ${customerPhone}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: bold; padding: 2px 0;">Address</td>
                          <td style="color: #1e293b; font-weight: 800; padding: 2px 0;">: ${customerAddress}</td>
                        </tr>
                      </table>
                    </td>
                    <!-- Avatar Bubble -->
                    <td style="vertical-align: middle; text-align: right; width: 70px;">
                      <div style="width: 52px; height: 52px; background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 50%; display: inline-block; text-align: center; line-height: 52px; font-weight: 950; font-size: 20px; color: #f43f5e;">
                        ${customerInitial}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Payment details & Summary row -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <!-- Left side: Payment Details -->
                  <td style="width: 48%; vertical-align: top; padding-right: 8px;">
                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; min-height: 140px;">
                      <div style="color: #4f46e5; font-weight: 900; font-size: 10px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">Payment Details</div>
                      <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.8;">
                        <tr>
                          <td style="color: #64748b; font-weight: 600;">Amount Paid</td>
                          <td style="text-align: right; color: #10b981; font-weight: 900; font-size: 12px;">₹${amountVal.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: 600;">Payment Method</td>
                          <td style="text-align: right; color: #1e293b; font-weight: 800;">${paymentMethod}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: 600;">Payment Status</td>
                          <td style="text-align: right;">
                            <span style="display: inline-block; background-color: #ecfdf5; color: #065f46; font-size: 8px; font-weight: bold; padding: 2px 6px; border-radius: 10px; text-transform: uppercase;">${statusText}</span>
                          </td>
                        </tr>
                      </table>
                      <div style="border-top: 1px solid #f1f5f9; margin-top: 8px; padding-top: 6px; font-size: 10px;">
                        <span style="color: #94a3b8; font-weight: bold; text-transform: uppercase; font-size: 8px; display: block;">Transaction ID (UTR)</span>
                        <span style="color: #475569; font-weight: 800; font-family: monospace; word-break: break-all;">${utrVal}</span>
                      </div>
                    </div>
                  </td>
                  <!-- Right side: Khata Summary -->
                  <td style="width: 48%; vertical-align: top; padding-left: 8px;">
                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; min-height: 140px; display: flex; flex-direction: column; justify-content: space-between;">
                      <div>
                        <div style="color: #4f46e5; font-weight: 900; font-size: 10px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">Khata Summary</div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.8;">
                          <tr>
                            <td style="color: #64748b; font-weight: 600;">Total You Gave</td>
                            <td style="text-align: right; color: #1e293b; font-weight: bold;">₹${totalUdhaarVal.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style="color: #64748b; font-weight: 600;">Total You Got</td>
                            <td style="text-align: right; color: #1e293b; font-weight: bold;">₹${totalJamaVal.toFixed(2)}</td>
                          </tr>
                        </table>
                      </div>
                      <div style="border-top: 1px solid #f1f5f9; margin-top: 8px; padding-top: 8px; display: table; width: 100%;">
                        <div style="display: table-cell; vertical-align: middle;">
                          <span style="font-size: 11px; font-weight: 900; color: ${balanceColor}; display: block; line-height: 1.1;">Net Balance</span>
                          <span style="font-size: 8px; color: ${balanceColor}; font-weight: bold; display: block;">${balanceLabel}</span>
                        </div>
                        <div style="display: table-cell; text-align: right; vertical-align: middle; font-size: 16px; font-weight: 950; color: ${balanceColor};">
                          ₹${finalBalanceVal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Timeline -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-bottom: 20px;">
                <div style="color: #4f46e5; font-weight: 900; font-size: 11px; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">Transaction Timeline</div>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                  ${timelineHtml}
                </table>
              </div>

              <!-- Footer Info -->
              <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 11px;">
                <tr>
                  <!-- Scan To Verify -->
                  <td style="vertical-align: middle;">
                    <table style="border-collapse: collapse;">
                      <tr>
                        <td>
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(frontendUrl + '/pay/' + customer._id)}" width="50" height="50" style="border: 1px solid #cbd5e1; padding: 2px; border-radius: 6px;" />
                        </td>
                        <td style="padding-left: 8px; text-align: left; vertical-align: middle;">
                          <h4 style="margin: 0; font-size: 11px; font-weight: 900; color: #1e293b;">Scan to Verify</h4>
                          <p style="margin: 2px 0 0 0; font-size: 9px; color: #64748b; font-weight: bold;">Receipt No: ${receiptNo}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Need Help -->
                  <td style="text-align: right; vertical-align: middle; color: #475569; font-weight: bold; font-size: 10px; line-height: 1.5;">
                    <h4 style="margin: 0 0 2px 0; font-size: 11px; font-weight: 900; color: #1e293b;">Need Help?</h4>
                    Owner: ${owner.name} | Phone: ${owner.phone}<br />
                    Email: support@udhaarkhata.com
                  </td>
                </tr>
              </table>

              <!-- Disclaimer -->
              <div style="border-top: 1px solid #f1f5f9; margin-top: 20px; padding-top: 12px; text-align: center; font-size: 9px; color: #94a3b8; font-weight: 600;">
                This is a computer generated receipt and does not require any signature.<br />
                Powered by Digital Udhaar Khata &nbsp;|&nbsp; Secured by Cashfree Payments
              </div>
            </div>
          </div>
        </div>
      `;

      await sendEmail({
        to: customer.email,
        subject: `Payment Receipt - ${storeName}`,
        text: textMessage,
        html: htmlMessage,
        attachments: [
          {
            filename: `receipt_${receiptNo}.pdf`,
            content: pdfBuffer,
          }
        ]
      });

      console.log(`🤖 KathaGPT sent payment receipt PDF to ${customer.name}`);
    }
  } catch (error) {
    console.error('❌ Error sending transaction email:', error);
  }
};

module.exports = { sendTransactionEmail };
