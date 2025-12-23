# Salary Overdraft Feature - Quick Test Guide

## 🧪 How to Test

### 1. Start the Server
```bash
npm run dev
```
Server should start on: http://localhost:4000

### 2. Open Chatbot
Navigate to: http://localhost:4000

### 3. Test Knowledge Base Responses

Try these questions in the chat:

#### General Information:
```
"What is a salary overdraft?"
"Tell me about salary overdraft"
"How does salary overdraft work?"
```
**Expected:** Bot explains the salary overdraft facility with key features

#### Requirements:
```
"What are the requirements for salary overdraft?"
"What documents do I need?"
"Salary overdraft eligibility"
```
**Expected:** Bot lists documents and eligibility criteria

#### Amount Limits:
```
"How much can I borrow with salary overdraft?"
"Maximum salary overdraft amount"
"Salary overdraft limits"
```
**Expected:** Bot explains 3x monthly salary limit with examples

#### Repayment Terms:
```
"How do I repay salary overdraft?"
"Salary overdraft repayment terms"
"How long to repay?"
```
**Expected:** Bot explains automatic deduction and 1-6 month terms

#### Comparison:
```
"Difference between salary overdraft and loan?"
"Should I get overdraft or loan?"
```
**Expected:** Bot compares both products with pros/cons

### 4. Test Form Trigger

Type any of these phrases:
```
"I want to apply for salary overdraft"
"Apply for salary overdraft"
"Request salary overdraft"
"I need a salary overdraft"
"Get salary overdraft"
```

**Expected:** 
- Bot says: "Great! I can help you apply for a salary overdraft..."
- Form appears in the chat with all fields

### 5. Fill the Form

Use this test data:

| Field | Value |
|-------|-------|
| Full Name | John Mensah |
| Phone Number | 0244123456 |
| National ID Number | GHA-123456789-0 |
| Account Number | 1234567890 |
| Employer Name | Ghana Education Service |
| Position | Senior Teacher |
| Employment Type | Permanent |
| Length of Service | 5 years |
| Net Monthly Salary | 2000 |
| Requested Amount | 4500 |
| Repayment Months | 3 |

Check all 3 consent boxes:
- [x] I confirm my salary is paid into my AKCB account
- [x] I confirm my employer is aware and consents to salary deductions
- [x] I declare all information provided is accurate

### 6. Verify Auto-Calculation

After entering salary (2000) and requested amount (4500):
- **Approved Amount:** Should show GHS 4,500.00
  - (min of 4500 vs 2000×3=6000, so 4500)
- **Monthly Repayment:** Should show GHS 1,500.00
  - (4500 ÷ 3 = 1500)

### 7. Submit Form

Click "Submit Application"

**Expected Success Message:**
```
✓ Salary overdraft application submitted successfully!

Application ID: 1
Approved Amount: GHS 4,500.00
Monthly Repayment: GHS 1,500.00 per month

Our team will review your application within 24 hours.
We will contact you at 0244123456.
```

### 8. Test Edge Cases

#### Case 1: Request More Than 3x Salary
```
Net Monthly Salary: 1000
Requested Amount: 5000
```
**Expected:** Approved Amount = GHS 3,000.00 (max 3x)

#### Case 2: Request Less Than Max
```
Net Monthly Salary: 2000
Requested Amount: 2500
```
**Expected:** Approved Amount = GHS 2,500.00 (requested amount)

#### Case 3: Minimum Salary
```
Net Monthly Salary: 500
Requested Amount: 1500
```
**Expected:** Approved Amount = GHS 1,500.00 (max 3x)

#### Case 4: Validation Errors
Leave a required field empty and submit
**Expected:** Error message showing which fields are required

### 9. Verify Database Record

Check MySQL database:
```sql
SELECT * FROM salary_overdrafts ORDER BY id DESC LIMIT 1;
```

Should see your test application with:
- All submitted values
- Calculated approved_amount and monthly_repayment
- status = 'pending'
- created_at = current timestamp

### 10. Test Admin Endpoint (Optional)

If you have an admin token:

```bash
curl -X GET "http://localhost:4000/api/admin/salary-overdrafts?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected:** JSON with all applications

---

## ✅ Test Checklist

- [ ] Server starts without errors
- [ ] Knowledge base loaded (159 entries)
- [ ] Salary overdraft module initialized
- [ ] Bot answers "what is salary overdraft?"
- [ ] Bot answers "salary overdraft requirements"
- [ ] Bot answers "how much can I borrow"
- [ ] Form appears when saying "apply for salary overdraft"
- [ ] All 11 fields visible in form
- [ ] Auto-calculation works for approved amount
- [ ] Auto-calculation works for monthly repayment
- [ ] Validation shows errors for empty fields
- [ ] Validation requires all 3 consent checkboxes
- [ ] Submission succeeds with valid data
- [ ] Success message shows application ID
- [ ] Database record created correctly
- [ ] Can view applications via admin endpoint

---

## 🎯 Expected Results Summary

| Test | Input | Expected Output |
|------|-------|-----------------|
| KB Query | "what is salary overdraft" | Explanation with features |
| KB Query | "requirements" | List of documents |
| KB Query | "how much" | 3x salary explanation |
| Form Trigger | "apply for salary overdraft" | Form appears |
| Auto-calc | Salary 2000, Request 4500 | Approved 4500, Monthly 1500 |
| Auto-calc | Salary 1000, Request 5000 | Approved 3000, Monthly 1000 |
| Validation | Empty name | Error message |
| Validation | Unchecked consent | Error message |
| Submit | Valid data | Success with app ID |
| Database | After submit | New record with status 'pending' |

---

## 🐛 Common Issues

### Issue: Form doesn't appear
- Check browser console (F12)
- Verify server logs show "Salary overdraft module initialized"
- Try exact phrase: "I want to apply for salary overdraft"

### Issue: Calculation shows GHS 0.00
- Ensure salary and amount fields have numeric values
- Check for JavaScript errors in console
- Verify fields are filled before calculation triggers

### Issue: Submit fails
- Check all required fields are filled
- Verify all 3 checkboxes are checked
- Check network tab for API error details

### Issue: KB doesn't respond
- Verify 159 KB entries loaded in server logs
- Try restarting server
- Check data/kb.json file exists

---

## 📊 Sample Test Scenarios

### Scenario 1: Teacher Requesting Emergency Cash
```
User: "I'm a teacher and need some emergency cash"
Bot: [Explains services]
User: "Tell me about salary overdraft"
Bot: [Explains overdraft facility]
User: "I want to apply"
Bot: [Opens form]
User: [Fills form with salary 2000, requests 3000]
System: Approves 3000, monthly 1000 (for 3 months)
```

### Scenario 2: High Earner Requesting Maximum
```
User: "Apply for salary overdraft"
Bot: [Opens form]
User: [Fills form with salary 5000, requests 20000]
System: Approves 15000 (max 3x), monthly 2500 (for 6 months)
```

### Scenario 3: Low Earner Requesting Small Amount
```
User: "I need a salary overdraft"
Bot: [Opens form]
User: [Fills form with salary 800, requests 1000]
System: Approves 1000, monthly 333.33 (for 3 months)
```

---

**Ready to Test!** 🚀

Open http://localhost:4000 and start chatting!
