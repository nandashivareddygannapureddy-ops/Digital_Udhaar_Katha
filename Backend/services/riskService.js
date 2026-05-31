const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');

/**
 * Calculate and update a customer's risk level, credit score, and due prediction.
 * Credit Score range: 300 to 900 (like CIBIL score)
 * Due Prediction:
 * - 'trusted': Trusted Customer ✅
 * - 'delay': Late Payer ⚠️
 * - 'risky': Risky Customer 🚨
 */
const updateRiskLevel = async (customerId) => {
  try {
    const customer = await Customer.findById(customerId);
    if (!customer) return;

    const transactions = await Transaction.find({ customer: customerId }).sort({ date: 1 });

    let score = 650; // Dynamic, realistic base score for starting customers
    let riskLevel = 'low';
    let duePrediction = 'trusted';

    const creditTxns = transactions.filter(t => t.type === 'credit');

    // 1. Promptness and Payment Speed Bonuses
    // For every settled transaction, check how long it took to settle (in days)
    let promptPayments = 0;
    let normalPayments = 0;
    let latePayments = 0;
    let veryLatePayments = 0;

    for (const txn of creditTxns) {
      if (txn.paymentStatus === 'SETTLED') {
        const settleTime = txn.updatedAt || txn.date;
        const daysDiff = Math.max(0, (new Date(settleTime) - new Date(txn.date)) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 3) {
          promptPayments++;
        } else if (daysDiff <= 10) {
          normalPayments++;
        } else if (daysDiff <= 25) {
          latePayments++;
        } else {
          veryLatePayments++;
        }
      } else {
        // Pending credit transaction: check how long it has been pending
        const daysPending = (Date.now() - new Date(txn.date)) / (1000 * 60 * 60 * 24);
        if (daysPending > 30) {
          veryLatePayments++;
        } else if (daysPending > 14) {
          latePayments++;
        }
      }
    }

    // Apply adjustments based on payment promptness categories
    score += (promptPayments * 35);
    score += (normalPayments * 15);
    score -= (latePayments * 40);
    score -= (veryLatePayments * 85);

    // 2. Outstanding Balance & Days Since Last Payment Penalties
    if (customer.balance > 0) {
      // Small balance has minimal penalty, high balances have higher penalties (credit utilization)
      if (customer.balance <= 1000) {
        score -= 10;
      } else if (customer.balance <= 5000) {
        score -= 40;
      } else if (customer.balance <= 10000) {
        score -= 85;
      } else {
        score -= 150;
      }

      // Check how long they have had an outstanding balance without paying anything back
      if (customer.lastPaymentDate) {
        const daysSincePayment = (Date.now() - new Date(customer.lastPaymentDate)) / (1000 * 60 * 60 * 24);
        if (daysSincePayment > 30) {
          score -= 100;
        } else if (daysSincePayment > 14) {
          score -= 40;
        }
      } else {
        // Outstanding balance and has never paid anything back
        const firstCredit = creditTxns[0];
        if (firstCredit) {
          const daysSinceFirstCredit = (Date.now() - new Date(firstCredit.date)) / (1000 * 60 * 60 * 24);
          if (daysSinceFirstCredit > 30) {
            score -= 100;
          } else if (daysSinceFirstCredit > 14) {
            score -= 40;
          }
        }
      }
    } else {
      // Clear account / advance balance bonus
      score += 25;
    }

    // 2.5 Overdue Payment Due Date Penalty
    if (customer.paymentDueDate && customer.balance > 0 && Date.now() > new Date(customer.paymentDueDate)) {
      const daysOverdue = Math.floor((Date.now() - new Date(customer.paymentDueDate)) / (1000 * 60 * 60 * 24));
      if (daysOverdue > 0) {
        score -= (daysOverdue * 15);
      }
    }

    // 3. Score Boundaries Check
    if (score > 900) score = 900;
    if (score < 300) score = 300;

    // 4. Determine status labels and risk level based on the computed score
    if (score >= 700) {
      duePrediction = 'trusted';
      riskLevel = 'low';
    } else if (score >= 550) {
      duePrediction = 'delay';
      riskLevel = 'medium';
    } else {
      duePrediction = 'risky';
      riskLevel = 'high';
    }

    // Update customer document
    customer.riskLevel = riskLevel;
    customer.creditScore = Math.round(score);
    customer.duePrediction = duePrediction;
    
    await customer.save();
    return {
      riskLevel: customer.riskLevel,
      creditScore: customer.creditScore,
      duePrediction: customer.duePrediction
    };
  } catch (error) {
    console.error('Risk calculation error:', error.message);
  }
};

module.exports = { updateRiskLevel };
