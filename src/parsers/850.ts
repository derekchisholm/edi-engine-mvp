export interface PurchaseOrder {
  poNumber: string;
  customer: {
    name: string;
    code: string;
  };
  items: Array<{
    sku: string;
    qty: number;
    price: number;
  }>;
}

export class Edi850Parser {
  public parse(x12: string): PurchaseOrder {
    // 1. Clean and split the file
    // Remove newlines to handle "wrapped" X12 vs "one-line" X12
    const rawSegments = x12.replace(/\n/g, '').split('~');

    const po: PurchaseOrder = {
      poNumber: '',
      customer: { name: '', code: '' },
      items: []
    };

    // 2. Iterate and Map
    for (const segmentStr of rawSegments) {
      const elements = segmentStr.split('*');
      const tag = elements[0];

      switch (tag) {
        case 'BEG': // Beginning of PO
          // BEG*00*SA*PO-12345**...
          po.poNumber = elements[3];
          break;

        case 'N1': // Name Loop
          // N1*ST*My Store*92*STORE-001
          if (elements[1] === 'ST' || elements[1] === 'BY') {
            po.customer.name = elements[2];
            po.customer.code = elements[4];
          }
          break;

        case 'PO1': // Line Item
          // PO1**10*EA*15.00**VN*SKU-123
          // Note: Element indexes shift based on optional fields, but simplified here:
          po.items.push({
            qty: parseInt(elements[2]),
            price: parseFloat(elements[4]),
            sku: elements[7] // Usually Vendor Part Number (VN) is at pos 6, value at 7
          });
          break;
      }
    }

    return po;
  }
}