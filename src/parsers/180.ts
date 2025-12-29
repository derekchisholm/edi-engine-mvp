import { ReturnAuthorizationOutput } from '../types';

export class Edi180Parser {
  public parse(x12: string): ReturnAuthorizationOutput {
    const rawSegments = x12.replace(/\n/g, '').split('~').map(s => s.trim()).filter(s => s.length > 0);

    const rma: ReturnAuthorizationOutput = {
      rmaNumber: '',
      customer: {},
      items: []
    };

    let currentItem: any = {};

    for (const segmentStr of rawSegments) {
      const elements = segmentStr.split('*');
      const tag = elements[0];

      switch (tag) {
        case 'BGN': // Beginning Segment
          // BGN*00*RMANumber*Date
          rma.rmaNumber = elements[2];
          // elements[3] is Date
          break;

        case 'N1': // Party Identification
          // N1*BY*Name*92*ID
          // BY = Buying Party (Customer)
          if (elements[1] === 'BY' || elements[1] === 'RM') { // RM = Party Remitting
            rma.customer.name = elements[2];
            rma.customer.id = elements[4];
          }
          break;

        case 'LIN': // Item Identification
          // If we had a previous item pending push, push it (though usually QTY follows LIN)
          if (currentItem.sku) {
             rma.items.push({
               sku: currentItem.sku,
               quantity: currentItem.quantity || 0,
               reasonCode: currentItem.reasonCode
             });
             currentItem = {};
          }
          
          // LIN**VN*SKU
          // Find 'VN' or 'UP'
          const vnIndex = elements.indexOf('VN');
          if (vnIndex > -1) {
            currentItem.sku = elements[vnIndex + 1];
          } else {
             // Fallback
             currentItem.sku = elements[3]; 
          }
          break;

        case 'QTY': // Quantity
          // QTY*21*10*EA
          // 21 = Return Quantity
          currentItem.quantity = parseInt(elements[2]);
          break;
          
        case 'PID': // Product Description / Reason
           // PID*F****Reason Description
           currentItem.reasonCode = elements[5];
           break;
      }
    }
    
    // Push last item
    if (currentItem.sku) {
      rma.items.push({
        sku: currentItem.sku,
        quantity: currentItem.quantity || 0,
        reasonCode: currentItem.reasonCode
      });
    }

    return rma;
  }
}
