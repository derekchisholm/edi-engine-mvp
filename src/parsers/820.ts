import { RemittanceInput } from '../types';

export class Edi820Parser {
  public parse(x12: string): RemittanceInput {
    // Clean and split
    const rawSegments = x12.replace(/\n/g, '').split('~');

    const remittance: RemittanceInput = {
      paymentNumber: '',
      paymentDate: new Date().toISOString(), // Default if not found
      totalAmount: 0,
      payer: '',
      invoices: []
    };

    for (const segmentStr of rawSegments) {
      const elements = segmentStr.split('*');
      const tag = elements[0];

      switch (tag) {
        case 'BPR': // Beginning Segment for Payment Order
          // BPR*I*150.00*C*...*20231025...
          // Element 2: Total Amount
          remittance.totalAmount = parseFloat(elements[2]);
          // Element 16: Effective Entry Date (YYMMDD or CCYYMMDD) - optional check
          if (elements[16]) {
             // Basic parsing, assuming CCYYMMDD for simplicity in this manual parser
             const d = elements[16];
             if (d.length === 8) {
               remittance.paymentDate = new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`).toISOString();
             }
          }
          break;

        case 'TRN': // Trace
          // TRN*1*PAYMENT-REF-123
          // Element 2: Reference Trace Number
          if (elements[1] === '1') {
             remittance.paymentNumber = elements[2];
          }
          break;

        case 'N1': // Name
          // N1*PR*Payer Name
          if (elements[1] === 'PR') {
            remittance.payer = elements[2];
          }
          break;

        case 'RMR': // Remittance Advice
          // RMR*IV*INV-1001**50.00
          // Element 1: Ref Qual (IV = Invoice)
          // Element 2: Ref Number
          // Element 4: Monetary Amount Paid
          if (elements[1] === 'IV') {
            remittance.invoices.push({
              invoiceNumber: elements[2],
              amountPaid: parseFloat(elements[4] || '0')
            });
          }
          break;
      }
    }

    return remittance;
  }
}
