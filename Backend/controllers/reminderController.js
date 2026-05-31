const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const { sendEmail } = require('../services/mailService');
const { generateStatementBuffer } = require('../services/pdfService');

// @desc    Send payment reminder to a customer via Email
// @route   POST /api/reminders/send/:customerId
const sendReminder = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.customerId,
      owner: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    if (customer.balance <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer has no outstanding balance',
      });
    }

    if (!customer.email) {
      return res.status(400).json({
        success: false,
        message: 'Customer does not have an email address configured. Please add an email address to this customer to send reminders.',
      });
    }

    const storeName = req.user.storeName || 'Digital Udhaar';
    const upiId = req.user.upiId;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const customerFirstName = customer.name ? customer.name.split(' ')[0] : 'Valued Customer';

    let textMessage = `Namaste ${customerFirstName}!\n\nThis is a friendly payment reminder from ${storeName}. Your pending due amount is ₹${customer.balance.toFixed(2)}.\n\nKindly clear your dues at your earliest convenience. Your detailed monthly statement has been attached to this email as a PDF. Thank you! 🙏`;

    // Append UPI collection link if merchant has configured UPI
    if (upiId) {
      textMessage += `Pay now: ${frontendUrl}/pay/${customer._id}`;
    }

    const htmlMessage = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

            <!-- TOP ORANGE BAR -->
            <tr><td style="background-color:#f97316;height:5px;border-radius:12px 12px 0 0;"></td></tr>

            <!-- MAIN CARD -->
            <tr><td style="background-color:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:36px 40px;">

              <!-- HEADER -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td>
                    <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#f97316;">PAYMENT REMINDER</span>
                    <h1 style="margin:6px 0 0 0;font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.02em;">${storeName}</h1>
                    <p style="margin:4px 0 0 0;font-size:13px;color:#6b7280;">Digital Udhaar Khata &nbsp;&bull;&nbsp; Outstanding Dues Notice</p>
                  </td>
                  <td align="right" valign="top">
                    <span style="display:inline-block;background-color:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:11px;font-weight:700;padding:5px 12px;border-radius:999px;">&#9679; Secure</span>
                  </td>
                </tr>
              </table>

              <!-- DIVIDER -->
              <div style="height:1px;background-color:#f3f4f6;margin-bottom:24px;"></div>

              <!-- GREETING -->
              <p style="font-size:15px;line-height:1.7;color:#374151;margin:0 0 6px 0;">Namaste <strong style="color:#111827;">${customerFirstName}</strong>,</p>
              <p style="font-size:14px;line-height:1.7;color:#6b7280;margin:0 0 24px 0;">You have an outstanding balance at <strong style="color:#111827;">${storeName}</strong>. Please review the details below and make a payment at your earliest convenience.</p>

              <!-- AMOUNT CARD -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#1f2937 0%,#111827 100%);border-radius:14px;padding:28px 24px;text-align:center;">
                    <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;">TOTAL OUTSTANDING DUE</p>
                    <p style="margin:0 0 12px 0;font-size:46px;font-weight:300;color:#ffffff;letter-spacing:-0.02em;">&#8377;${customer.balance.toFixed(2)}</p>
                    <span style="display:inline-block;background-color:#ef444420;border:1px solid #ef444440;color:#fca5a5;font-size:11px;font-weight:700;padding:4px 14px;border-radius:999px;">OVERDUE &bull; ACTION REQUIRED</span>
                  </td>
                </tr>
              </table>

              <!-- PAYMENT DETAILS ROW -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                    <table width="100%"><tr>
                      <td style="font-size:12px;color:#6b7280;font-weight:600;">Customer Name</td>
                      <td align="right" style="font-size:13px;color:#111827;font-weight:700;">${customer.name}</td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                    <table width="100%"><tr>
                      <td style="font-size:12px;color:#6b7280;font-weight:600;">Outstanding Amount</td>
                      <td align="right" style="font-size:13px;color:#ef4444;font-weight:700;">&#8377;${customer.balance.toFixed(2)}</td>
                    </tr></table>
                  </td>
                </tr>
                ${upiId ? `
                <tr>
                  <td style="padding:8px 0;">
                    <table width="100%"><tr>
                      <td style="font-size:12px;color:#6b7280;font-weight:600;">Pay to UPI ID</td>
                      <td align="right" style="font-size:13px;color:#111827;font-weight:700;font-family:monospace;">${upiId}</td>
                    </tr></table>
                  </td>
                </tr>` : ''}
              </table>

              ${upiId ? `
              <!-- CTA BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <a href="${frontendUrl}/pay/${customer._id}" style="display:inline-block;background-color:#f97316;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 48px;border-radius:12px;letter-spacing:0.01em;box-shadow:0 4px 14px rgba(249,115,22,0.4);">Pay &#8377;${customer.balance.toFixed(2)} Now &rarr;</a>
                  </td>
                </tr>
              </table>

              <!-- SUPPORTED APPS -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="font-size:11px;color:#9ca3af;font-weight:600;">Accepted via &nbsp; PhonePe &nbsp;&bull;&nbsp; Google Pay &nbsp;&bull;&nbsp; Paytm &nbsp;&bull;&nbsp; BHIM UPI &nbsp;&bull;&nbsp; Any UPI App</td>
                </tr>
              </table>

              <!-- SECURE NOTE -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;margin-bottom:28px;">
                <tr>
                  <td style="font-size:12px;color:#15803d;font-weight:600;">&#128274;&nbsp; This is a secure, direct UPI payment link. Your payment goes directly to ${storeName}'s bank account.</td>
                </tr>
              </table>` : ''}

              <!-- DIVIDER -->
              <div style="height:1px;background-color:#f3f4f6;margin-bottom:20px;"></div>

              <!-- FOOTER -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;color:#6b7280;">
                    <strong style="color:#111827;">${storeName}</strong><br/>
                    Powered by <span style="color:#f97316;">Digital Udhaar Khata</span>
                  </td>
                  <td align="right" style="font-size:11px;color:#9ca3af;">This is an automated reminder.<br/>Please do not reply to this email.</td>
                </tr>
              </table>

            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    `;

    // Fetch transactions for PDF statement
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const transactions = await Transaction.find({
      customer: customer._id,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    const store = {
      storeName,
      name: req.user.name,
      phone: req.user.phone,
      upiId: req.user.upiId || '',
    };
    const dateRange = {
      startDate: start.toLocaleDateString('en-IN'),
      endDate: end.toLocaleDateString('en-IN'),
    };

    const pdfBuffer = await generateStatementBuffer(store, customer, transactions, dateRange);

    const result = await sendEmail({
      to: customer.email,
      subject: `Pending Due Reminder from ${storeName}`,
      text: textMessage,
      html: htmlMessage,
      attachments: [
        {
          filename: `statement_${customer.name.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Email reminder sent to ${customer.name} at ${customer.email}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send bulk reminders to all customers with balance > 0 via Email
// @route   POST /api/reminders/send-bulk
const sendBulkReminders = async (req, res, next) => {
  try {
    const customers = await Customer.find({
      owner: req.user._id,
      balance: { $gt: 0 },
      email: { $gt: '' },
    });

    if (customers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No customers with outstanding balance and email addresses configured',
        data: { sent: 0, failed: 0 },
      });
    }

    const storeName = req.user.storeName || 'Digital Udhaar';
    const upiId = req.user.upiId;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    let sent = 0;
    let failed = 0;
    const results = [];

    for (const customer of customers) {
      try {
        const customerFirstName = customer.name ? customer.name.split(' ')[0] : 'Valued Customer';
        let textMessage = `Namaste ${customerFirstName}!\n\nThis is a friendly payment reminder from ${storeName}. Your pending due amount is ₹${customer.balance.toFixed(2)}.\n\nKindly clear your dues at your earliest convenience. Your detailed monthly statement has been attached to this email as a PDF. Thank you! 🙏`;

        if (upiId) {
          textMessage += `\n\n💳 Pay now: ${frontendUrl}/pay/${customer._id}`;
        }

        const htmlMessage = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

            <!-- TOP ORANGE BAR -->
            <tr><td style="background-color:#f97316;height:5px;border-radius:12px 12px 0 0;"></td></tr>

            <!-- MAIN CARD -->
            <tr><td style="background-color:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:36px 40px;">

              <!-- HEADER -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td>
                    <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#f97316;">PAYMENT REMINDER</span>
                    <h1 style="margin:6px 0 0 0;font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.02em;">${storeName}</h1>
                    <p style="margin:4px 0 0 0;font-size:13px;color:#6b7280;">Digital Udhaar Khata &nbsp;&bull;&nbsp; Outstanding Dues Notice</p>
                  </td>
                  <td align="right" valign="top">
                    <span style="display:inline-block;background-color:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:11px;font-weight:700;padding:5px 12px;border-radius:999px;">&#9679; Secure</span>
                  </td>
                </tr>
              </table>

              <!-- DIVIDER -->
              <div style="height:1px;background-color:#f3f4f6;margin-bottom:24px;"></div>

              <!-- GREETING -->
              <p style="font-size:15px;line-height:1.7;color:#374151;margin:0 0 6px 0;">Namaste <strong style="color:#111827;">${customerFirstName}</strong>,</p>
              <p style="font-size:14px;line-height:1.7;color:#6b7280;margin:0 0 24px 0;">You have an outstanding balance at <strong style="color:#111827;">${storeName}</strong>. Please review the details below and make a payment at your earliest convenience.</p>

              <!-- AMOUNT CARD -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#1f2937 0%,#111827 100%);border-radius:14px;padding:28px 24px;text-align:center;">
                    <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;">TOTAL OUTSTANDING DUE</p>
                    <p style="margin:0 0 12px 0;font-size:46px;font-weight:300;color:#ffffff;letter-spacing:-0.02em;">&#8377;${customer.balance.toFixed(2)}</p>
                    <span style="display:inline-block;background-color:#ef444420;border:1px solid #ef444440;color:#fca5a5;font-size:11px;font-weight:700;padding:4px 14px;border-radius:999px;">OVERDUE &bull; ACTION REQUIRED</span>
                  </td>
                </tr>
              </table>

              <!-- PAYMENT DETAILS ROW -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                    <table width="100%"><tr>
                      <td style="font-size:12px;color:#6b7280;font-weight:600;">Customer Name</td>
                      <td align="right" style="font-size:13px;color:#111827;font-weight:700;">${customer.name}</td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                    <table width="100%"><tr>
                      <td style="font-size:12px;color:#6b7280;font-weight:600;">Outstanding Amount</td>
                      <td align="right" style="font-size:13px;color:#ef4444;font-weight:700;">&#8377;${customer.balance.toFixed(2)}</td>
                    </tr></table>
                  </td>
                </tr>
                ${upiId ? `
                <tr>
                  <td style="padding:8px 0;">
                    <table width="100%"><tr>
                      <td style="font-size:12px;color:#6b7280;font-weight:600;">Pay to UPI ID</td>
                      <td align="right" style="font-size:13px;color:#111827;font-weight:700;font-family:monospace;">${upiId}</td>
                    </tr></table>
                  </td>
                </tr>` : ''}
              </table>

              ${upiId ? `
              <!-- CTA BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <a href="${frontendUrl}/pay/${customer._id}" style="display:inline-block;background-color:#f97316;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 48px;border-radius:12px;letter-spacing:0.01em;box-shadow:0 4px 14px rgba(249,115,22,0.4);">Pay &#8377;${customer.balance.toFixed(2)} Now &rarr;</a>
                  </td>
                </tr>
              </table>

              <!-- SUPPORTED APPS -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="font-size:11px;color:#9ca3af;font-weight:600;">Accepted via &nbsp; PhonePe &nbsp;&bull;&nbsp; Google Pay &nbsp;&bull;&nbsp; Paytm &nbsp;&bull;&nbsp; BHIM UPI &nbsp;&bull;&nbsp; Any UPI App</td>
                </tr>
              </table>

              <!-- SECURE NOTE -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;margin-bottom:28px;">
                <tr>
                  <td style="font-size:12px;color:#15803d;font-weight:600;">&#128274;&nbsp; This is a secure, direct UPI payment link. Your payment goes directly to ${storeName}'s bank account.</td>
                </tr>
              </table>` : ''}

              <!-- DIVIDER -->
              <div style="height:1px;background-color:#f3f4f6;margin-bottom:20px;"></div>

              <!-- FOOTER -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;color:#6b7280;">
                    <strong style="color:#111827;">${storeName}</strong><br/>
                    Powered by <span style="color:#f97316;">Digital Udhaar Khata</span>
                  </td>
                  <td align="right" style="font-size:11px;color:#9ca3af;">This is an automated reminder.<br/>Please do not reply to this email.</td>
                </tr>
              </table>

            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
        `;

        // Fetch transactions for PDF statement
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const transactions = await Transaction.find({
          customer: customer._id,
          date: { $gte: start, $lte: end },
        }).sort({ date: 1 });

        const store = {
          storeName,
          name: req.user.name,
          phone: req.user.phone,
          upiId: req.user.upiId || '',
        };
        const dateRange = {
          startDate: start.toLocaleDateString('en-IN'),
          endDate: end.toLocaleDateString('en-IN'),
        };

        const pdfBuffer = await generateStatementBuffer(store, customer, transactions, dateRange);

        await sendEmail({
          to: customer.email,
          subject: `Pending Due Reminder from ${storeName}`,
          text: textMessage,
          html: htmlMessage,
          attachments: [
            {
              filename: `statement_${customer.name.replace(/\s+/g, '_')}.pdf`,
              content: pdfBuffer,
            }
          ]
        });

        sent++;
        results.push({ customer: customer.name, status: 'sent', email: customer.email });
      } catch (err) {
        failed++;
        results.push({ customer: customer.name, status: 'failed', error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Email reminders sent: ${sent}, Failed: ${failed}`,
      data: { sent, failed, results },
    });
  } catch (error) {
    next(error);
  }
};

// Backwards-compatible SMS wrapper redirecting to Email
const sendFast2SMSSMS = async (req, res, next) => {
  try {
    req.params.customerId = req.body.customerId;
    return await sendReminder(req, res, next);
  } catch (err) {
    next(err);
  }
};

// Backwards-compatible WhatsApp wrapper redirecting to Email
const sendCloudWhatsApp = async (req, res, next) => {
  try {
    req.params.customerId = req.body.customerId;
    return await sendReminder(req, res, next);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendReminder,
  sendBulkReminders,
  sendFast2SMSSMS,
  sendCloudWhatsApp,
};
