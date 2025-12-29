import { X12Builder } from '../lib/x12-builder';
import { PoAckInput } from '../types';

export class Edi855Generator {
  public generate(input: PoAckInput, sender: string, receiver: string): string {
    const builder = new X12Builder();
    
    // Map internal status to X12 code
    // AT: Accepted, RD: Rejected, AC: Acknowledge with Changes
    let ackCode = 'AT'; 
    if (input.ackStatus === 'Rejected') ackCode = 'RD';
    if (input.ackStatus === 'AcceptedWithChanges') ackCode = 'AC';

    const date = input.ackDate 
      ? new Date(input.ackDate).toISOString().slice(0, 10).replace(/-/g, '') 
      : new Date().toISOString().slice(0, 10).replace(/-/g, '');

    builder.addISA(sender, receiver);
    builder.addGS('PR', sender, receiver); // PR = Purchase Order Acknowledgement

    // ST Header
    builder.addSegment('ST', '855', '0001');

    // BAK: Beginning Segment
    // 00 = Original
    // ackCode = Status
    // input.poNumber
    // date
    builder.addSegment('BAK', '00', ackCode, input.poNumber, date);

    // Items Loop
    let segmentCount = 2; // ST, BAK so far
    
    if (input.items) {
      input.items.forEach((item, index) => {
        // PO1: Item Detail
        // We might not have all details like price here, usually we mirror the PO.
        // For simple ack, we can just ref the SKU.
        // PO1*LineNum**Qty*Unit***VN*SKU~
        builder.addSegment('PO1', (index + 1).toString(), '', item.quantity.toString(), 'EA', '', '', 'VN', item.sku);
        segmentCount++;

        // ACK: Line Item Ack
        // IA: Item Accepted, IR: Item Rejected, IB: Backordered
        let itemStatus = 'IA';
        if (item.status === 'Rejected') itemStatus = 'IR';
        if (item.status === 'Backordered') itemStatus = 'IB';

        builder.addSegment('ACK', itemStatus, item.quantity.toString(), 'EA');
        segmentCount++;
      });
    }

    // CTT: Transaction Totals
    // Number of line items
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
