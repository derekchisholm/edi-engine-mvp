import { PurchaseOrderChangeInput } from '../types';

export class Edi860Parser {
  public parse(x12: string): PurchaseOrderChangeInput {
    const rawSegments = x12.replace(/\n/g, '').split('~').map(s => s.trim()).filter(s => s.length > 0);

    const result: PurchaseOrderChangeInput = {
      changeOrderNumber: '',
      poNumber: '',
      changeDate: '',
      changeType: '04', // Default
      items: []
    };
    
    let currentLoop = '';

    for (const segmentStr of rawSegments) {
      const elements = segmentStr.split('*');
      const tag = elements[0];

      switch (tag) {
        case 'BCH': // Beginning Segment for Purchase Order Change
          // BCH*04*NE*PO123*RELEASE*20231027~
          // 01: Change Type (04)
          // 02: PO Type (NE)
          // 03: PO Number
          // 04: Change Order Number
          // 05: Date
          if (['01', '04'].includes(elements[1])) {
             result.changeType = elements[1] as '01' | '04';
          }
          result.poNumber = elements[3];
          result.changeOrderNumber = elements[4];
          if (elements[5]) {
            // YYYYMMDD -> YYYY-MM-DD
            result.changeDate = `${elements[5].slice(0,4)}-${elements[5].slice(4,6)}-${elements[5].slice(6,8)}`;
          }
          break;

        case 'N1':
           currentLoop = elements[1];
           if (currentLoop === 'ST') {
              result.shipTo = {
                  name: elements[2],
                  code: elements[4]
              };
           }
           break;
        case 'N3':
            if (currentLoop === 'ST' && result.shipTo) result.shipTo.address1 = elements[1];
            break;
        case 'N4':
            if (currentLoop === 'ST' && result.shipTo) {
                result.shipTo.city = elements[1];
                result.shipTo.state = elements[2];
                result.shipTo.zip = elements[3];
                result.shipTo.country = elements[4];
            }
            break;

        case 'POC': // Line Item Change
          // POC*LineId*ChangeCode*QtyOrdered*QtyLeft*UOM*Price...*VN*SKU
          const changeCodeRaw = elements[2];
          let validChangeCode: 'AI' | 'DI' | 'CA' | 'QD' = 'CA'; // Default fallback
          if (['AI', 'DI', 'CA', 'QD'].includes(changeCodeRaw)) {
              validChangeCode = changeCodeRaw as any;
          }

          const item: any = {
            lineNumber: elements[1] ? parseInt(elements[1]) : undefined,
            changeCode: validChangeCode,
            sku: ''
          };

          if (elements[3]) item.quantity = parseFloat(elements[3]);
          if (elements[6]) item.price = parseFloat(elements[6]);

          const vnIndex = elements.indexOf('VN');
          if (vnIndex > -1) {
            item.sku = elements[vnIndex + 1];
          } else {
             item.sku = elements[9] || 'UNKNOWN'; 
          }

          result.items.push(item);
          break;
      }
    }

    // Fallback ID if missing
    if (!result.changeOrderNumber) {
        result.changeOrderNumber = `${result.poNumber}-CHANGE`;
    }

    return result;
  }
}