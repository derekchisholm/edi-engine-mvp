import { PurchaseOrderInput } from '../types';

export class Edi850Parser {
  public parse(x12: string): PurchaseOrderInput {
    // 1. Clean and split the file
    const rawSegments = x12.replace(/\n/g, '').split('~').map(s => s.trim()).filter(s => s.length > 0);

    const po: PurchaseOrderInput = {
      transactionSetHeader: [],
      beginningSegmentForPurchaseOrder: [],
      N1Loop: [],
      P01Loop: []
    };

    let currentN1Loop: any = null; // To hold transient N1 data

    // 2. Iterate and Map
    for (const segmentStr of rawSegments) {
      const elements = segmentStr.split('*');
      const tag = elements[0];

      switch (tag) {
        case 'ST':
           po.transactionSetHeader?.push({
               transactionSetIdentifierCode: elements[1],
               transactionSetControlNumber: elements[2]
           });
           break;

        case 'BEG': // Beginning of PO
          // BEG*00*NE*PO-12345**20231027...
          // BEG01: Trans Set Purpose Code (00)
          // BEG02: PO Type Code (NE)
          // BEG03: PO Number
          // BEG04: Release Number
          // BEG05: Date
          po.beginningSegmentForPurchaseOrder?.push({
              purchaseOrderTypeCode: elements[2],
              purchaseOrderNumber: elements[3],
              releaseNumber: elements[4],
              date: elements[5]
          });
          break;

        case 'N1': // Name Loop
          // N1*ST*My Store*92*STORE-001
          currentN1Loop = {
              partyIdentification: [{
                  entityIdentifierCode: elements[1],
                  name: elements[2],
                  identificationCodeQualifier: elements[3],
                  identificationCode: elements[4]
              }],
              geographicLocation: []
              // partyLocation (N3) omitted for now as per schema simplification or added if needed
          };
          po.N1Loop?.push(currentN1Loop);
          break;

        case 'N4': // Geo
           // N4*City*State*Zip*Country
           if (currentN1Loop) {
             currentN1Loop.geographicLocation.push({
                 cityName: elements[1],
                 stateOrProvinceCode: elements[2],
                 postalCode: elements[3],
                 countryCode: elements[4]
             });
           }
           break;

        case 'PO1': // Line Item
          // PO1*LINENUM*QTY*UOM*PRICE*BASIS*VN*SKU...
          // elements[1] assignedId
          // elements[2] quantity
          // elements[3] uom
          // elements[4] price
          // elements[5] basis code
          // elements[6] qualifier (VN)
          // elements[7] id (SKU)
          
          let sku = '';
          const vnIndex = elements.indexOf('VN');
          if (vnIndex > -1) {
            sku = elements[vnIndex + 1];
          } else {
             sku = elements[7] || 'UNKNOWN';
          }

          po.P01Loop?.push({
              baselineItemData: [{
                  assignedIdentification: elements[1],
                  quantityOrdered: elements[2] ? parseFloat(elements[2]) : 0,
                  unitOfMeasurementCode: elements[3] || 'EA',
                  unitPrice: elements[4] ? parseFloat(elements[4]) : 0,
                  basisOfUnitPriceCode: elements[5],
                  productServiceIDQualifier: 'VN',
                  productServiceID: sku
              }]
          });
          break;
      }
    }

    return po;
  }
}
