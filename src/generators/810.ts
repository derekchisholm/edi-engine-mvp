import { X12Builder } from '../lib/x12-builder';
import { InvoiceInput } from '../types';

export class Edi810Generator {
  public generate(input: InvoiceInput, sender: string, receiver: string): string {
    const builder = new X12Builder();
    const date = new Date(input.invoiceDate).toISOString().slice(0, 10).replace(/-/g, '');

    builder.addISA(sender, receiver);
    builder.addGS('IN', sender, receiver); // IN = Invoice

    // ST Header
    builder.addSegment('ST', '810', '0001');

    // BIG: Beginning Segment
    // Date, Invoice Num, Date, PO Num
    builder.addSegment('BIG', date, input.invoiceNumber, date, input.poNumber);

    let segmentCount = 2;

    // N1 Loop (Simplified)
    // RE = Remit To (The Supplier)
    builder.addSegment('N1', 'RE', 'MYBUSINESS');
    segmentCount++;
    
    // Items Loop
    input.items.forEach((item, index) => {
      // IT1: Item Data
      // Line Num, Qty, UOM, Price, Basis (PE = Price Each), ID Qual (VN), ID
      builder.addSegment(
        'IT1', 
        (index + 1).toString(), 
        item.quantity.toString(), 
        'EA', 
        item.unitPrice.toFixed(2), 
        'PE', 
        'VN', 
        item.sku
      );
      segmentCount++;
    });

    // TDS: Total Monetary Value Summary
    // Amount * 100 (formatted implies just number usually, X12 often implies 2 decimal implied, 
    // but TDS is usually raw amount in cents or full depending on version. 
    // Standard practice: Amount * 100 if implied decimal, or just Amount with explicit dot? 
    // X12 TDS element 361 is N2 (Numeric 2 decimals implied). So 10.00 -> 1000.
    const amountPennies = Math.round(input.totalAmount * 100).toString();
    builder.addSegment('TDS', amountPennies);
    segmentCount++;

    // CTT: Transaction Totals
    // Number of line items
    builder.addSegment('CTT', input.items.length.toString());
    segmentCount++;

    // Trailers
    segmentCount++;
    builder.addSegment('SE', segmentCount.toString(), '0001');
    builder.addSegment('GE', '1', '1');
    builder.addSegment('IEA', '1', '000000001');

    return builder.toString();
  }
}
