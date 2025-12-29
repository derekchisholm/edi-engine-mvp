import { X12Builder } from '../lib/x12-builder';
import { AsnInput } from '../types';

export class Edi856Generator {
  public generate(input: AsnInput, sender: string, receiver: string): string {
    const builder = new X12Builder();
    const date = new Date(input.shipDate).toISOString().slice(0, 10).replace(/-/g, '');
    const time = new Date(input.shipDate).toISOString().slice(11, 16).replace(/:/g, '');

    builder.addISA(sender, receiver);
    builder.addGS('SH', sender, receiver); // SH = Ship Notice

    // ST Header
    builder.addSegment('ST', '856', '0001');

    // BSN: Beginning Segment
    // 00 = Original
    builder.addSegment('BSN', '00', input.shipmentId, date, time);

    let segmentCount = 2; // ST, BSN
    let hlCount = 0;

    // --- HL LEVEL 1: SHIPMENT ---
    hlCount++;
    const shipmentHlId = hlCount;
    // HL*ID*ParentID*LevelCode
    builder.addSegment('HL', shipmentHlId.toString(), '', 'S'); // S = Shipment
    segmentCount++;

    // TD5: Carrier Details
    // B = Origin/Delivery Carrier (Any Mode)
    // 2 = Standard Carrier Alpha Code (SCAC)
    builder.addSegment('TD5', 'B', '2', input.carrier, 'M'); // M = Motor
    segmentCount++;

    // REF: Reference (Tracking)
    // CN = Carrier's Reference Number (PRO/Invoice)
    builder.addSegment('REF', 'CN', input.trackingNumber);
    segmentCount++;

    // DTM: Date (Shipped)
    // 011 = Shipped
    builder.addSegment('DTM', '011', date, time);
    segmentCount++;

    // N1: Name (Ship To)
    // ST = Ship To
    builder.addSegment('N1', 'ST', input.shipTo.name); 
    segmentCount++;
    if (input.shipTo.address1) {
      builder.addSegment('N3', input.shipTo.address1);
      segmentCount++;
    }
    builder.addSegment('N4', input.shipTo.city, input.shipTo.state, input.shipTo.zip);
    segmentCount++;

    // --- HL LEVEL 2: ORDER ---
    hlCount++;
    const orderHlId = hlCount;
    builder.addSegment('HL', orderHlId.toString(), shipmentHlId.toString(), 'O'); // O = Order
    segmentCount++;

    // PRF: Purchase Order Reference
    builder.addSegment('PRF', input.poNumber);
    segmentCount++;

    // --- HL LEVEL 3: ITEMS ---
    input.items.forEach((item) => {
      hlCount++;
      // I = Item
      builder.addSegment('HL', hlCount.toString(), orderHlId.toString(), 'I');
      segmentCount++;

      // LIN: Item Identification
      // VN = Vendor's (Seller's) Item Number
      builder.addSegment('LIN', '', 'VN', item.sku);
      segmentCount++;

      // SN1: Item Detail (Shipment)
      // Qty, UOM (EA)
      builder.addSegment('SN1', '', item.quantity.toString(), 'EA');
      segmentCount++;
    });

    // CTT: Transaction Totals
    // Count of HL segments
    builder.addSegment('CTT', hlCount.toString());
    segmentCount++;

    // Trailers
    segmentCount++; // SE
    builder.addSegment('SE', segmentCount.toString(), '0001');
    builder.addSegment('GE', '1', '1');
    builder.addSegment('IEA', '1', '000000001');

    return builder.toString();
  }
}
