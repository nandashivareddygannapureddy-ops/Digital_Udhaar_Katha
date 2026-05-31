const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const CashbookEntry = require('../models/CashbookEntry');
const { updateRiskLevel } = require('../services/riskService');
const axios = require('axios');

// Indian Phonetic Key (IPK) mapping for English, Hindi, and Telugu consonants
function getIndianPhoneticKey(str) {
  if (!str) return '';
  str = str.toLowerCase();
  
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = str.charCodeAt(i);
    
    // English consonants
    if (char === 'r') result += 'R';
    else if (char === 'v' || char === 'w') result += 'V';
    else if (char === 's') {
      if (str[i+1] === 'h') {
        result += 'S';
        i++;
      } else {
        result += 'S';
      }
    }
    else if (char === 't') {
      if (str[i+1] === 'h') {
        result += 'T';
        i++;
      } else {
        result += 'T';
      }
    }
    else if (char === 'd') {
      if (str[i+1] === 'h') {
        result += 'D';
        i++;
      } else {
        result += 'D';
      }
    }
    else if (char === 'n') result += 'N';
    else if (char === 'm') result += 'M';
    else if (char === 'k') {
      if (str[i+1] === 'h') {
        result += 'K';
        i++;
      } else {
        result += 'K';
      }
    }
    else if (char === 'g') {
      if (str[i+1] === 'h') {
        result += 'G';
        i++;
      } else {
        result += 'G';
      }
    }
    else if (char === 'p') {
      if (str[i+1] === 'h') {
        result += 'P';
        i++;
      } else {
        result += 'P';
      }
    }
    else if (char === 'f') result += 'P';
    else if (char === 'b') {
      if (str[i+1] === 'h') {
        result += 'B';
        i++;
      } else {
        result += 'B';
      }
    }
    else if (char === 'l') result += 'L';
    else if (char === 'y') result += 'Y';
    else if (char === 'c' && str[i+1] === 'h') {
      result += 'C';
      i++;
    }
    else if (char === 'j') result += 'J';
    
    // Hindi Devanagari mappings (0x0900 to 0x097F)
    else if (code >= 0x0900 && code <= 0x097F) {
      if (code === 0x0930 || code === 0x0931) result += 'R';
      else if (code === 0x0935) result += 'V';
      else if (code === 0x0938 || code === 0x0939 || code === 0x0936 || code === 0x0937) result += 'S';
      else if (code === 0x0924 || code === 0x0925 || code === 0x091F || code === 0x0920) result += 'T';
      else if (code === 0x0926 || code === 0x0927 || code === 0x0921 || code === 0x0922) result += 'D';
      else if (code === 0x0928 || code === 0x0929 || code === 0x0923) result += 'N';
      else if (code === 0x092e) result += 'M';
      else if (code === 0x0915 || code === 0x0916) result += 'K';
      else if (code === 0x0917 || code === 0x0918) result += 'G';
      else if (code === 0x092a || code === 0x092b) result += 'P';
      else if (code === 0x092c || code === 0x092d) result += 'B';
      else if (code === 0x0932 || code === 0x0933 || code === 0x0934) result += 'L';
      else if (code === 0x092f) result += 'Y';
      else if (code === 0x091a || code === 0x091b) result += 'C';
      else if (code === 0x091c || code === 0x091d) result += 'J';
    }
    
    // Telugu mappings (0x0C00 to 0x0C7F)
    else if (code >= 0x0C00 && code <= 0x0C7F) {
      if (code === 0x0C30 || code === 0x0C31) result += 'R';
      else if (code === 0x0C35) result += 'V';
      else if (code === 0x0C38 || code === 0x0C39 || code === 0x0C36 || code === 0x0C37) result += 'S';
      else if (code === 0x0C24 || code === 0x0C25 || code === 0x0C1F || code === 0x0C20) result += 'T';
      else if (code === 0x0C26 || code === 0x0C27 || code === 0x0C21 || code === 0x0C22) result += 'D';
      else if (code === 0x0C28 || code === 0x0C23) result += 'N';
      else if (code === 0x0C2E) result += 'M';
      else if (code === 0x0C15 || code === 0x0C16) result += 'K';
      else if (code === 0x0C17 || code === 0x0C18) result += 'G';
      else if (code === 0x0C2A || code === 0x0C2B) result += 'P';
      else if (code === 0x0C2C || code === 0x0C2D) result += 'B';
      else if (code === 0x0C32 || code === 0x0C33) result += 'L';
      else if (code === 0x0C2F) result += 'Y';
      else if (code === 0x0C1A || code === 0x0C1B) result += 'C';
      else if (code === 0x0C1C || code === 0x0C1D) result += 'J';
    }
  }
  return result;
}

// Find a matching customer in the query text
const findMatchedCustomer = (text, customers) => {
  const normalizedText = text.toLowerCase();
  
  // 1. Direct substring match (very fast for English)
  for (const customer of customers) {
    if (normalizedText.includes(customer.name.toLowerCase())) {
      return customer;
    }
  }

  // 2. Word-by-word phonetic key matching (handles multi-script: English, Hindi, Telugu)
  const textWords = text.split(/\s+/);
  const textWordKeys = textWords.map(w => getIndianPhoneticKey(w)).filter(Boolean);

  for (const customer of customers) {
    const nameWords = customer.name.split(/\s+/);
    const nameWordKeys = nameWords.map(w => getIndianPhoneticKey(w)).filter(Boolean);

    if (nameWordKeys.length === 0) continue;

    // Check if the customer's first name matches any word in the query phonetically
    const firstNameKey = nameWordKeys[0];
    if (textWordKeys.includes(firstNameKey)) {
      return customer;
    }
  }

  return null;
};

// @desc    Parse voice entry and automatically add transaction
const voiceEntry = async (req, res, next) => {
  try {
    const { text, customerId } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Speech text is required' });
    }

    let matchedCustomer = null;
    let amount = null;
    let type = 'credit';

    const customers = await Customer.find({ owner: req.user._id });

    // Try using Groq if key is present
    if (process.env.GROQ_API_KEY) {
      try {
        const voicePrompt = `You are a helper that parses spoken transaction transcripts for a shopkeeper.
The user might speak a customer credit transaction (e.g., "Ravi took 300 rupees today") OR a business cashbook expense/income entry (e.g., "Added electricity bill 1500" or "Got cash 200").

Here is the list of existing customers:
${customers.map(c => `- Name: ${c.name}`).join('\n')}

Analyze the transcribed text and output a JSON object.
Rules:
1. If the text is about adding a customer credit transaction (e.g. "Ravi took 300 rupees"):
   - "isCashbook": false
   - "customerName": the exact matching name from the customer list (or null if none)
   - "amount": the numerical amount (e.g. 300)
   - "type": "credit" if they took goods/borrowed money, "debit" if they paid back
   - "category": null
   - "description": "Voice Entry: " + text

2. If the text is about a general business expense or income for the cashbook (e.g. "Added electricity bill 1500" or "Added rent 1000" or "Got cash 500"):
   - "isCashbook": true
   - "customerName": null
   - "amount": the numerical amount (e.g. 1500)
   - "type": "out" if it is an expense/bill/rent/salary/food/stock purchase, "in" if it is an income/sales/got cash
   - "category": Choose one of: "Stock", "Rent", "Salary", "Electricity", "Food", "Other" (for out/expense), or "Sales", "Other" (for in/income). Matches the context (e.g. "electricity bill" matches "Electricity")
   - "description": The description of the item (e.g. "Electricity bill")

Spoken text: "${text}"

You MUST respond ONLY with a JSON object in this format: { "isCashbook": boolean, "customerName": string | null, "amount": number | null, "type": "credit" | "debit" | "in" | "out" | null, "category": string | null, "description": string }`;

        const groqResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: voicePrompt },
              { role: 'user', content: text }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );

        const parsed = JSON.parse(groqResponse.data.choices[0].message.content);
        if (parsed.isCashbook) {
          const entry = await CashbookEntry.create({
            owner: req.user._id,
            type: parsed.type === 'in' ? 'in' : 'out',
            amount: parsed.amount,
            description: parsed.description || `Voice Entry: "${text}"`,
            category: parsed.category || 'Other',
            paymentMode: 'cash',
            date: new Date()
          });

          return res.status(201).json({
            success: true,
            isCashbook: true,
            message: `Successfully recorded ${entry.type === 'in' ? 'Income' : 'Expense'}: ₹${entry.amount} for ${entry.category}`,
            data: entry
          });
        }

        if (parsed.customerName) {
          matchedCustomer = customers.find(c => c.name.toLowerCase() === parsed.customerName.toLowerCase());
        }
        if (parsed.amount) {
          amount = parsed.amount;
        }
        if (parsed.type) {
          type = parsed.type;
        }
      } catch (groqErr) {
        console.error('Groq voice parsing error, falling back to local:', groqErr.message);
      }
    }

    // Fallback: local keyword detection for Cashbook
    let isLocalCashbook = false;
    let localCategory = 'Other';
    let localType = 'out';
    const normalizedText = text.toLowerCase();

    if (normalizedText.includes('added') || normalizedText.includes('bill') || normalizedText.includes('expense') || normalizedText.includes('rent') || normalizedText.includes('salary') || normalizedText.includes('electricity') || normalizedText.includes('food') || normalizedText.includes('stock')) {
      isLocalCashbook = true;
      if (normalizedText.includes('stock')) localCategory = 'Stock';
      else if (normalizedText.includes('rent')) localCategory = 'Rent';
      else if (normalizedText.includes('salary')) localCategory = 'Salary';
      else if (normalizedText.includes('electricity') || normalizedText.includes('power') || normalizedText.includes('current')) localCategory = 'Electricity';
      else if (normalizedText.includes('food')) localCategory = 'Food';
      
      if (normalizedText.includes('sales') || normalizedText.includes('got cash') || normalizedText.includes('income')) {
        localType = 'in';
      }
    }

    if (isLocalCashbook) {
      const amountMatch = text.match(/\b\d+(?:\.\d+)?\b/);
      if (amountMatch) {
        const localAmount = parseFloat(amountMatch[0]);
        const entry = await CashbookEntry.create({
          owner: req.user._id,
          type: localType,
          amount: localAmount,
          description: `Voice Entry: "${text}"`,
          category: localCategory,
          paymentMode: 'cash',
          date: new Date()
        });

        return res.status(201).json({
          success: true,
          isCashbook: true,
          message: `Successfully recorded ${entry.type === 'in' ? 'Income' : 'Expense'}: ₹${entry.amount} for ${entry.category}`,
          data: entry
        });
      }
    }

    // Fallback to local rule-based parsing for Customer Transaction if Groq failed or key is missing
    if (!matchedCustomer || !amount) {
      if (customerId) {
        matchedCustomer = await Customer.findOne({ _id: customerId, owner: req.user._id });
      }
      if (!matchedCustomer) {
        matchedCustomer = findMatchedCustomer(text, customers);
      }
      if (!matchedCustomer) {
        return res.status(404).json({
          success: false,
          message: 'Could not match any customer from the voice entry. Try saying the customer name clearly.',
          parsed: { text }
        });
      }

      const amountMatch = text.match(/\b\d+(?:\.\d+)?\b/);
      if (!amountMatch) {
        return res.status(400).json({
          success: false,
          message: `Matched customer ${matchedCustomer.name}, but couldn't find an amount. Try saying e.g., "took 300 rupees".`,
          parsed: { customer: matchedCustomer.name }
        });
      }
      amount = parseFloat(amountMatch[0]);

      // Determine type locally
      let creditScoreCount = 0;
      let debitScoreCount = 0;
      const creditKeywords = [
        'took', 'taken', 'borrow', 'borrowed', 'bought', 'buy', 'udhaar', 'due', 'gave to', 'give to', 'credit',
        'लिया', 'लिए', 'उधार', 'खरीदा',
        'తీసుకున్నాడు', 'తీసుకుంది', 'తీసుకున్నారు', 'కొన్నాడు', 'ఉధార్'
      ];
      const debitKeywords = [
        'paid', 'return', 'returned', 'received', 'got', 'debit', 'gave back', 'pay',
        'दिया', 'मिला', 'मिले', 'जमा', 'वापस', 'चुका',
        'ఇచ్చాడు', 'ఇచ్చింది', 'ఇచ్చారు', 'వచ్చింది', 'వచ్చాయి', 'తిరిగి', 'చెల్లించాడు'
      ];
      creditKeywords.forEach(k => { if (normalizedText.includes(k)) creditScoreCount++; });
      debitKeywords.forEach(k => { if (normalizedText.includes(k)) debitScoreCount++; });
      if (normalizedText.includes('को') || normalizedText.includes('ko')) creditScoreCount += 3;
      if (normalizedText.includes('ने') || normalizedText.includes('ne')) debitScoreCount += 3;
      if (normalizedText.includes('కి') || normalizedText.includes('కు') || normalizedText.includes('ki') || normalizedText.includes('ku')) creditScoreCount += 3;
      if (normalizedText.includes('నుండి') || normalizedText.includes('నుంచి') || normalizedText.includes('nundi') || normalizedText.includes('nunchi')) debitScoreCount += 3;

      type = (debitScoreCount > creditScoreCount) ? 'debit' : 'credit';
    }

    // Create the transaction
    const transaction = await Transaction.create({
      customer: matchedCustomer._id,
      owner: req.user._id,
      type,
      amount,
      description: `Voice Entry: "${text}"`,
      paymentStatus: type === 'debit' ? 'SETTLED' : 'PENDING',
      date: new Date()
    });

    // Update customer balance
    if (type === 'credit') {
      matchedCustomer.balance += amount;
    } else {
      matchedCustomer.balance -= amount;
      matchedCustomer.lastPaymentDate = new Date();
    }
    matchedCustomer.totalTransactions = (matchedCustomer.totalTransactions || 0) + 1;
    await matchedCustomer.save();

    // Async update risk, score, prediction
    await updateRiskLevel(matchedCustomer._id);

    res.status(201).json({
      success: true,
      message: `Successfully recorded transaction: ₹${amount} ${type === 'credit' ? 'Due (Gave)' : 'Paid (Got)'} for ${matchedCustomer.name}`,
      data: {
        transaction,
        customerName: matchedCustomer.name,
        updatedBalance: matchedCustomer.balance,
        duePrediction: matchedCustomer.duePrediction,
        creditScore: matchedCustomer.creditScore
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mini Chatbot AI Assistant
// @route   POST /api/ai/chat
const chatAssistant = async (req, res, next) => {
  try {
    const { message, history, lang } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const ownerId = req.user._id;
    const User = require('../models/User');
    const owner = await User.findById(ownerId);
    const ownerName = owner ? owner.name : 'Shopkeeper';
    const storeName = owner ? owner.storeName : 'Udhaar Khata';
    const langName = lang === 'hi' ? 'Hindi' : lang === 'te' ? 'Telugu' : 'English';

    const customers = await Customer.find({ owner: ownerId });
    
    // Fetch last 20 transactions populated with customer names
    const transactions = await Transaction.find({ owner: ownerId })
      .sort({ date: -1, createdAt: -1 })
      .limit(20)
      .populate('customer', 'name');

    // Fetch last 10 cashbook entries
    const cashbookEntries = await CashbookEntry.find({ owner: ownerId })
      .sort({ date: -1 })
      .limit(10);

    if (process.env.GROQ_API_KEY) {
      try {
        const systemPrompt = `You are KathaGPT, an intelligent ledger helper for a kirana store / small shopkeeper.
You are assisting the shop owner, ${ownerName}, who runs the shop named "${storeName}".
Today's date and time is ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.

Here is the real-time data of the shopkeeper's customers (names, current balances, credit scores, AI prediction labels, risk levels):
${customers.map(c => `- Name: ${c.name}, Balance: ₹${c.balance} (${c.balance > 0 ? 'owes you / due' : c.balance < 0 ? 'advance' : 'settled'}), Credit Score: ${c.creditScore || 750}, AI Prediction: ${c.duePrediction === 'trusted' ? 'Trusted Customer ✅' : c.duePrediction === 'delay' ? 'Late Payer ⚠️' : 'Risky Customer 🚨'}, Risk: ${c.riskLevel.toUpperCase()}`).join('\n')}

Here is the list of recent ledger transactions (last 20 entries, sorted from newest to oldest):
${transactions.map((t, index) => `${index + 1}. Date: ${new Date(t.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}, Customer: ${t.customer ? t.customer.name : 'Unknown'}, Type: ${t.type === 'credit' ? 'Udhaar (Gave / Customer owes)' : 'Jama (Got / Paid back)'}, Amount: ₹${t.amount}, Description: ${t.description || 'none'}, Status: ${t.paymentStatus}, Mode: ${t.paymentMode || 'none'}, Txn ID: ${t._id}`).join('\n')}

Here is the list of recent cashbook entries (last 10 business income/expense items):
${cashbookEntries.map((e, index) => `${index + 1}. Date: ${new Date(e.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, Type: ${e.type === 'in' ? 'Income (Cash In)' : 'Expense (Cash Out)'}, Amount: ₹${e.amount}, Category: ${e.category}, Description: ${e.description || 'none'}`).join('\n')}

Rules for your responses:
1. Answer the user's question accurately using the customer, transaction, and cashbook data provided above.
2. If they ask about recent transactions, specific items purchased, last payment received, or who paid recently, refer to the transaction and cashbook lists.
3. Keep your answers brief, professional, and clear. Avoid lengthy pleasantries.
4. The user's active application interface language is ${langName}. You MUST respond strictly in ${langName}. Do NOT use any other language (e.g., if the language is English, write your entire response and suggestion buttons in English only; if Hindi, write in Hindi only; if Telugu, write in Telugu only). Do not mix languages.
5. Provide 2-3 short, relevant follow-up query suggestions that the user might want to click next (e.g. "Who has highest due?", "Show this month collection", "Risky customers").
6. You are talking directly to the shop owner, ${ownerName}. When they say 'who am I', 'my name', or ask you to recognise their name, they are referring to themselves. Confirm warmly and conversationally that they are ${ownerName}, the owner of "${storeName}". Do NOT search the customer ledger/database for their name to see if they are a customer.

You MUST respond ONLY with a JSON object in this format:
{
  "response": "Your structured markdown text response here",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

        const groqMessages = [
          { role: 'system', content: systemPrompt }
        ];

        if (history && Array.isArray(history)) {
          groqMessages.push(...history);
        }

        const lastHistoryMsg = history && history.length > 0 ? history[history.length - 1] : null;
        if (!lastHistoryMsg || lastHistoryMsg.content !== message) {
          groqMessages.push({ role: 'user', content: message });
        }

        const groqResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.1-8b-instant',
            messages: groqMessages,
            response_format: { type: 'json_object' },
            temperature: 0.2
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 7000
          }
        );

        const parsed = JSON.parse(groqResponse.data.choices[0].message.content);
        return res.status(200).json({
          success: true,
          response: parsed.response,
          suggestions: parsed.suggestions || []
        });
      } catch (groqErr) {
        console.error('Groq chat error, falling back to local:', groqErr.message);
      }
    }

    // Fallback to local rule-based chatbot if key is missing or API fails
    const normalized = message.toLowerCase().trim();

    // 0. Check for Last/Recent Transaction queries
    if (normalized.includes('last transaction') || normalized.includes('recent transaction') || normalized.includes('recent payment') || normalized.includes('last payment') || normalized.includes('recent entry')) {
      const lastTxn = await Transaction.findOne({ owner: ownerId })
        .sort({ date: -1, createdAt: -1 })
        .populate('customer', 'name');
      
      if (!lastTxn) {
        return res.status(200).json({
          success: true,
          response: "You haven't recorded any transactions yet.",
          suggestions: ["Show this month collection", "Who has highest due?"]
        });
      }

      const formattedDate = new Date(lastTxn.date).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      return res.status(200).json({
        success: true,
        response: `📝 **Last Transaction Details:**\n\n* **Customer:** **${lastTxn.customer ? lastTxn.customer.name : 'Unknown'}**\n* **Type:** ${lastTxn.type === 'credit' ? 'Udhaar (Gave / Customer owes)' : 'Jama (Got / Paid back)'}\n* **Amount:** **₹${lastTxn.amount.toLocaleString('en-IN')}**\n* **Date & Time:** ${formattedDate}\n* **Description:** ${lastTxn.description || 'No description'}\n* **Status:** ${lastTxn.paymentStatus || 'Pending'}\n* **Payment Mode:** ${lastTxn.paymentMode || 'none'}\n* **ID:** \`${lastTxn._id}\``,
        suggestions: ["Show this month collection", "Who has highest due?", "Risky customers"]
      });
    }

    // 1. Check for Greeting
    if (/^(hi|hello|hey|hola|greetings|namaste|నమస్తే|नमस्ते)/i.test(normalized)) {
      return res.status(200).json({
        success: true,
        response: `Hello ${ownerName}! I am **KathaGPT** 🤖\n\nYou can ask me questions about your ledger, like:\n- "How much udhar does customer have?"\n- "Show this month collection"\n- "Who has highest due?"\n- "Who are the risky customers?"\n- "List customers with highest credit scores"`,
        suggestions: ["How much udhar does customer have?", "Show this month collection", "Who has highest due?", "Risky customers"]
      });
    }

    // 1.5 Check for shop/owner name questions
    if (normalized.includes('shop name') || normalized.includes('store name') || normalized.includes('my shop') || normalized.includes('my store')) {
      return res.status(200).json({
        success: true,
        response: `🏪 Your shop store name is **"${storeName}"**.`,
        suggestions: ["How much udhar does customer have?", "Show this month collection"]
      });
    }

    if (normalized.includes('my name') || normalized.includes('who am i') || normalized.includes('who i am')) {
      return res.status(200).json({
        success: true,
        response: `👤 You are **${ownerName}**, the owner of **"${storeName}"**.`,
        suggestions: ["How much udhar does customer have?", "Show this month collection"]
      });
    }

    const matchedCustomer = findMatchedCustomer(message, customers);

    // 2. Query: Balance of a specific customer
    if (matchedCustomer && (
      normalized.includes('how much') || normalized.includes('balance') || normalized.includes('due') || normalized.includes('udhar') ||
      normalized.includes('उधार') || normalized.includes('बैलेंस') || normalized.includes('बाकी') ||
      normalized.includes('ఉధార్') || normalized.includes('బాకీ') || normalized.includes('బ్యాలెన్స్')
    )) {
      const predLabel = matchedCustomer.duePrediction === 'trusted' ? 'Trusted Customer ✅'
                      : matchedCustomer.duePrediction === 'delay' ? 'Late Payer ⚠️'
                      : 'Risky Customer 🚨';
                      
      let statusText = '';
      if (matchedCustomer.balance > 0) {
        statusText = `owes you ₹${matchedCustomer.balance.toLocaleString('en-IN')}`;
      } else if (matchedCustomer.balance < 0) {
        statusText = `has an advance payment of ₹${Math.abs(matchedCustomer.balance).toLocaleString('en-IN')}`;
      } else {
        statusText = `has all clear (₹0 balance)`;
      }

      return res.status(200).json({
        success: true,
        response: `**${matchedCustomer.name}** ${statusText}.\n\n* **Credit Score:** ${matchedCustomer.creditScore || 750} / 900\n* **AI Status:** ${predLabel}\n* **Risk Level:** ${matchedCustomer.riskLevel.toUpperCase()}`,
        suggestions: [`Show details for ${matchedCustomer.name}`, "Who has highest due?", "Show this month collection"]
      });
    }

    // 3. Query: This Month Collection
    if (
      normalized.includes('month collection') || normalized.includes('collection this month') || normalized.includes('monthly collection') ||
      normalized.includes('महीने का कलेक्शन') || normalized.includes('महीने की वसूली') ||
      normalized.includes('నెల కలెక్షన్') || normalized.includes('నెల వసూలు')
    ) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const txns = await Transaction.find({
        owner: ownerId,
        type: 'debit',
        date: { $gte: startOfMonth }
      });

      const totalCollection = txns.reduce((sum, t) => sum + t.amount, 0);

      return res.status(200).json({
        success: true,
        response: `📈 **This Month's Collection:**\n\nYou have collected a total of **₹${totalCollection.toLocaleString('en-IN')}** from payments this month.`,
        suggestions: ["Show today's transactions", "Who has highest due?", "Risky customers"]
      });
    }

    // 4. Query: Who has highest due?
    if (
      normalized.includes('highest due') || normalized.includes('highest udhar') || normalized.includes('highest balance') || normalized.includes('owes the most') ||
      normalized.includes('सबसे ज्यादा उधार') || normalized.includes('सबसे ज्यादा बकाया') ||
      normalized.includes('ఎక్కువ బాకీ') || normalized.includes('ఎక్కువ ఉధార్')
    ) {
      const sortedCustomers = [...customers].sort((a, b) => b.balance - a.balance);
      const topCustomer = sortedCustomers[0];

      if (!topCustomer || topCustomer.balance <= 0) {
        return res.status(200).json({
          success: true,
          response: "No customers have outstanding dues right now! Everyone is cleared up. 🎉",
          suggestions: ["Show this month collection", "Risky customers"]
        });
      }

      return res.status(200).json({
        success: true,
        response: `👑 **Highest Due Customer:**\n\n**${topCustomer.name}** has the highest outstanding due of **₹${topCustomer.balance.toLocaleString('en-IN')}**.\n\n* Credit Score: ${topCustomer.creditScore || 750}\n* AI Prediction: ${topCustomer.duePrediction === 'trusted' ? 'Trusted ✅' : topCustomer.duePrediction === 'delay' ? 'Late Payer ⚠️' : 'Risky 🚨'}`,
        suggestions: [`How much udhar does ${topCustomer.name} have?`, "Show this month collection", "Risky customers"]
      });
    }

    // 5. Query: Risky customers
    if (
      normalized.includes('risky') || normalized.includes('high risk') ||
      normalized.includes('रिस्की') || normalized.includes('जोखिम') ||
      normalized.includes('రిస్క్') || normalized.includes('రిస్కీ')
    ) {
      const risky = customers.filter(c => c.duePrediction === 'risky' || c.riskLevel === 'high');

      if (risky.length === 0) {
        return res.status(200).json({
          success: true,
          response: "Great news! You have **0 High-Risk** customers right now. Everyone pays on time or has low outstanding balances. ✅",
          suggestions: ["Show this month collection", "Who has highest due?"]
        });
      }

      const listStr = risky.map((c, i) => `${i+1}. **${c.name}** - Due: ₹${c.balance.toLocaleString('en-IN')} (Score: ${c.creditScore})`).join('\n');

      return res.status(200).json({
        success: true,
        response: `⚠️ **Risky Customers (High Risk of Delay):**\n\nThe following customers may delay payments based on their transaction speed and history:\n\n${listStr}`,
        suggestions: ["Show this month collection", "Who has highest due?"]
      });
    }

    // 6. Query: Credit scores
    if (normalized.includes('credit score') || normalized.includes('score') || normalized.includes('क्रेडिट स्कोर')) {
      const sorted = [...customers].sort((a, b) => b.creditScore - a.creditScore);
      const top3 = sorted.slice(0, 3);
      const bottom3 = [...sorted].reverse().slice(0, 3);

      const topStr = top3.map((c, i) => `${i+1}. **${c.name}**: ${c.creditScore}`).join('\n');
      const bottomStr = bottom3.map((c, i) => `${i+1}. **${c.name}**: ${c.creditScore}`).join('\n');

      return res.status(200).json({
        success: true,
        response: `📊 **Customer Credit Scores Overview:**\n\n**Top Rated (Trusted) Customers:**\n${topStr}\n\n**Needs Attention (Risky/Late):**\n${bottomStr}`,
        suggestions: ["Risky customers", "Who has highest due?", "Show this month collection"]
      });
    }

    // 7. Query: Today's transactions
    if (normalized.includes('today') || normalized.includes('आज') || normalized.includes('ఈరోజు')) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const txns = await Transaction.find({
        owner: ownerId,
        date: { $gte: startOfToday }
      }).populate('customer', 'name');

      if (txns.length === 0) {
        return res.status(200).json({
          success: true,
          response: "You haven't recorded any transactions yet today. 🗓️",
          suggestions: ["Show this month collection", "Who has highest due?"]
        });
      }

      const txnsList = txns.map((t, i) => `${i+1}. **${t.customer ? t.customer.name : 'Unknown'}**: ${t.type === 'credit' ? 'Got Udhaar' : 'Paid Back'} ₹${t.amount} (${t.description || 'No desc'})`).join('\n');

      return res.status(200).json({
        success: true,
        response: `📅 **Today's Transactions:**\n\n${txnsList}`,
        suggestions: ["Show this month collection", "Who has highest due?"]
      });
    }

    return res.status(200).json({
      success: true,
      response: "I'm not sure how to answer that question. 😅\n\nYou can ask me things like:\n* \"How much udhar does customer have?\"\n* \"Show this month collection\"\n* \"Who has highest due?\"\n* \"Who is risky?\"\n* \"What is the credit score of Suresh?\"",
      suggestions: ["How much udhar does customer have?", "Show this month collection", "Who has highest due?", "Risky customers"]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  voiceEntry,
  chatAssistant
};
