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
    const poNumber = order.beginningSegmentForPurchaseOrder?.[0]?.purchaseOrderNumber || '';
    builder.addSegment('W05', 'N', poNumber);

    // N1 Loop - Ship To
    // Find N1 loop with Entity Identifier 'ST'
    const shipToLoop = order.N1Loop?.find(l => l.partyIdentification?.[0]?.entityIdentifierCode === 'ST');
    if (shipToLoop) {
      const n1 = shipToLoop.partyIdentification?.[0];
      const n4 = shipToLoop.geographicLocation?.[0];
      
      if (n1) {
        builder.addN1('ST', n1.name || '', n1.identificationCodeQualifier || '', n1.identificationCode);
      }
      // Note: Address lines (N3) omitted in current schema refactor, skipping N3 generation for now.
      
      if (n4) {
        builder.addN4(n4.cityName || '', n4.stateOrProvinceCode || '', n4.postalCode || '', n4.countryCode || '');
      }
    }

    // W01 - Line Items (Loop)
    order.P01Loop?.forEach(loop => {
      const item = loop.baselineItemData?.[0];
      if (item) {
        // W01*10*EA**VN*SKU123~
        builder.addSegment('W01', 
          item.quantityOrdered.toString(),
          item.unitOfMeasurementCode || 'EA',
          '', // UPC placeholder
          'VN',
          item.productServiceID || ''
        );
      }
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
