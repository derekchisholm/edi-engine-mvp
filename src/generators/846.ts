import { X12Builder } from '../lib/x12-builder';
import { InventoryAdviceInput } from '../types';

export class Edi846Generator {
  public generate(input: InventoryAdviceInput, sender: string, receiver: string): string {
    const builder = new X12Builder();
    
    const date = new Date(input.date).toISOString().slice(0, 10).replace(/-/g, ''); // CCYYMMDD

    builder.addISA(sender, receiver);
    builder.addGS('IB', sender, receiver); // IB = Inventory Inquiry/Advice

    // ST Header
    builder.addSegment('ST', '846', '0001');

    // BIA: Beginning Segment for Inventory Inquiry/Advice
    // 00 = Original
    // DD = Distributor Inventory Report
    // Advice Number
    // Date
    builder.addSegment('BIA', '00', 'DD', input.adviceNumber, date);

    let segmentCount = 2; // ST, BIA so far

    // Items Loop
    if (input.items) {
      input.items.forEach((item, index) => {
        // LIN: Item Identification
        // LIN**VN*SKU
        builder.addSegment('LIN', '', 'VN', item.sku);
        segmentCount++;

        // QTY: Quantity Information
        // 33 = Quantity Available
        // Quantity
        // EA = Each
        builder.addSegment('QTY', '33', item.quantity.toString(), 'EA');
        segmentCount++;
        
        // Optional: DTM for date of inventory, N1 for location, etc. can be added here
      });
    }

    // CTT: Transaction Totals
    // Number of line items (LIN segments)
    builder.addSegment('CTT', input.items ? input.items.length.toString() : '0');
    segmentCount++;

    // Trailers
    segmentCount++; // For SE
    builder.addSegment('SE', segmentCount.toString(), '0001');
    builder.addSegment('GE', '1', '1');
    builder.addSegment('IEA', '1', '000000001');

    return builder.toString();
  }
}
