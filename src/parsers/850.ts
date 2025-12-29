import { PurchaseOrderInput } from '../types';

export class Edi850Parser {
  public parse(x12: string): PurchaseOrderInput {
    // 1. Clean and split the file
    const rawSegments = x12.replace(/\n/g, '').split('~').map(s => s.trim()).filter(s => s.length > 0);

    const po: PurchaseOrderInput = {
      poNumber: '',
      poDate: '',
      type: 'NE',
      currency: 'USD',
      shipTo: { name: '' },
      items: []
    };

    let currentLoop = ''; // N1 loop context

    // 2. Iterate and Map
    for (const segmentStr of rawSegments) {
      const elements = segmentStr.split('*');
      const tag = elements[0];

      switch (tag) {
        case 'BEG': // Beginning of PO
          // BEG*00*NE*PO-12345**20231027...
          po.type = elements[2];
          po.poNumber = elements[3];
          if (elements[5]) {
            // YYYYMMDD -> YYYY-MM-DD
            po.poDate = `${elements[5].slice(0,4)}-${elements[5].slice(4,6)}-${elements[5].slice(6,8)}`;
          }
          break;

        case 'N1': // Name Loop
          // N1*ST*My Store*92*STORE-001
          // N1*BT*Buyer Name*92*BY-001
          // N1*VN*Vendor Name*92*VN-001
          currentLoop = elements[1];
          const name = elements[2];
          const code = elements[4];
          
          if (currentLoop === 'ST') {
            po.shipTo = { name, code };
          } else if (currentLoop === 'BT') {
            po.buyer = { name, code };
          } else if (currentLoop === 'VN') {
            po.vendor = { name, code };
          }
          break;

        case 'N3': // Address
           if (currentLoop === 'ST' && po.shipTo) po.shipTo.address1 = elements[1];
           if (currentLoop === 'BT' && po.buyer) po.buyer.address1 = elements[1];
           if (currentLoop === 'VN' && po.vendor) po.vendor.address1 = elements[1];
           break;

        case 'N4': // Geo
           if (currentLoop === 'ST' && po.shipTo) {
             po.shipTo.city = elements[1];
             po.shipTo.state = elements[2];
             po.shipTo.zip = elements[3];
             po.shipTo.country = elements[4];
           }
           if (currentLoop === 'BT' && po.buyer) {
             po.buyer.city = elements[1];
             po.buyer.state = elements[2];
             po.buyer.zip = elements[3];
             po.buyer.country = elements[4];
           }
           // same for vendor...
           break;

        case 'PO1': // Line Item
          // PO1**10*EA*15.00**VN*SKU-123
          // PO1*LINENUM*QTY*UOM*PRICE*BASIS*VN*SKU...
          const item: any = {
            lineNumber: elements[1] ? parseInt(elements[1]) : undefined,
            quantity: elements[2] ? parseFloat(elements[2]) : 0,
            uom: elements[3] || 'EA',
            price: elements[4] ? parseFloat(elements[4]) : 0,
            sku: ''
          };

          // Find SKU (VN)
          const vnIndex = elements.indexOf('VN');
          if (vnIndex > -1) {
            item.sku = elements[vnIndex + 1];
          } else {
             // Fallback
             item.sku = elements[7] || 'UNKNOWN';
          }
          
          po.items.push(item);
          break;
          
        case 'PID': // Description
           // PID*F****Description text
           if (po.items.length > 0) {
              const lastItem = po.items[po.items.length - 1];
              lastItem.description = elements[5];
           }
           break;
      }
    }

    return po;
  }
}
