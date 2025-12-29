import { PurchaseOrderInput } from './types';
import { X12Builder } from './lib/x12-builder';

export class Edi940Generator {
  public generate(order: PurchaseOrderInput, senderId: string, receiverId: string): string {
    const builder = new X12Builder();

    // 1. ISA Envelope
    builder.addISA(senderId, receiverId);

    // 2. GS Envelope (OW = Warehouse Shipping Order)
    builder.addGS('OW', senderId, receiverId);

    // 3. ST Envelope
    builder.addST('940');

    // 4. Data
    
    // W05 - Warehouse Shipment Identification
    // W05*N*PO123~
    builder.addSegment('W05', 'N', order.poNumber);

    // N1 Loop - Ship To
    if (order.shipTo) {
      builder.addN1('ST', order.shipTo.name, order.shipTo.code ? '92' : '', order.shipTo.code);
      if (order.shipTo.address1) builder.addN3(order.shipTo.address1, order.shipTo.address2);
      if (order.shipTo.city && order.shipTo.state && order.shipTo.zip) {
        builder.addN4(order.shipTo.city, order.shipTo.state, order.shipTo.zip, order.shipTo.country);
      }
    }

    // W01 - Line Items (Loop)
    order.items.forEach((item, index) => {
      // W01*10*EA**VN*SKU123~
      // Standard 940 W01: Qty, UOM, UPC, VN, SKU
      builder.addSegment('W01', 
        item.quantity.toString(),
        item.uom || 'EA',
        '', // UPC placeholder
        'VN',
        item.sku
      );
    });

    // W76 - Total Shipping Order (Optional but good practice)
    // builder.addSegment('W76', order.items.length.toString());

    // 5. Trailers
    builder.addSE();
    builder.addGE();
    builder.addIEA();

    return builder.toString();
  }
}
