import { PurchaseOrderChangeOutput } from '../types';

export class Edi860Parser {
  public parse(x12: string): PurchaseOrderChangeOutput {
    const rawSegments = x12.replace(/\n/g, '').split('~').map(s => s.trim()).filter(s => s.length > 0);

    const result: PurchaseOrderChangeOutput = {
      changeNumber: '',
      poNumber: '',
      changeDate: '',
      items: []
    };

    for (const segmentStr of rawSegments) {
      const elements = segmentStr.split('*');
      const tag = elements[0];

      switch (tag) {
        case 'BCH': // Beginning Segment for Purchase Order Change
          // BCH*ChangeTypeCode*ChangeType*PONum*...*Date
          // 01 = Change Type Code (01=Cancel, 04=Change)
          // 03 = PO Number
          // 06 = Date
          result.changeType = elements[1];
          result.poNumber = elements[3];
          result.changeDate = elements[6];
          // Sometimes Change Request Number is separate or part of ref
          break;

        case 'POC': // Line Item Change
          // POC*LineId*ChangeCode*QtyOrdered*QtyLeft*UOM*Price...*VN*SKU
          // 01: Line Item ID
          // 02: Change Code (AI=Add, CA=Change, DI=Delete)
          // 03: Quantity Ordered (New qty if change)
          // 04: Quantity Left (Accumulated) - Context dependent
          // 05: UOM
          // 06: Unit Price
          // ... Product ID pairs usually start around index 8 or 9
          
          const item: any = {
            lineId: elements[1],
            changeCode: elements[2]
          };

          if (elements[3]) item.quantity = parseFloat(elements[3]);
          if (elements[6]) item.price = parseFloat(elements[6]);

          // Simple SKU extraction (looking for VN or UP or generic position)
          // Just like 850, we look for 'VN' or 'UP'
          const vnIndex = elements.indexOf('VN');
          if (vnIndex > -1) {
            item.sku = elements[vnIndex + 1];
          } else {
             // Try common position
             item.sku = elements[9]; 
          }

          result.items.push(item);
          break;
      }
    }

    // Attempt to extract a change number if not in BCH (sometimes in REF)
    if (!result.changeNumber) {
        // Fallback: use PO Number + Date as ID if specific change ID isn't found
        result.changeNumber = `${result.poNumber}-${result.changeDate}`;
    }

    return result;
  }
}
