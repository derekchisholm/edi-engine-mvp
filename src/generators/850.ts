import { X12Builder } from '../lib/x12-builder';
import { PurchaseOrderInput, PurchaseOrderPayload } from '../types';

export class Edi850Generator {
  public generate(input: PurchaseOrderPayload, sender: string, receiver: string): string {
    const builder = new X12Builder();
    
    builder.addISA(sender, receiver);
    builder.addGS('PO', sender, receiver); // PO = Purchase Order

    input.transactionSets.forEach((po, index) => {
      // Use provided control number or fallback to index
      const st = po.transactionSetHeader?.[0];
      const controlNumber = st?.transactionSetControlNumber || (index + 1).toString().padStart(4, '0');
      
      // Transaction Header
      builder.addST('850', controlNumber);

      this.generateTransactionBody(builder, po);

      // Trailers
      builder.addSE(controlNumber);
    });

    builder.addGE(input.transactionSets.length.toString());
    builder.addIEA();

    return builder.toString();
  }

  private generateTransactionBody(builder: X12Builder, input: PurchaseOrderInput) {
    // BEG: Beginning Segment
    const beg = input.beginningSegmentForPurchaseOrder?.[0];
    if (beg) {
       // Note: addBEG signature might need check, assuming (tset, type, poNum, date)
       // Old usage: addBEG('00', input.type, input.poNumber, input.poDate)
       // New: type=purchaseOrderTypeCode, num=purchaseOrderNumber
       builder.addBEG('00', beg.purchaseOrderTypeCode, beg.purchaseOrderNumber, beg.date);
    }

    // N1 Loops
    input.N1Loop?.forEach(loop => {
        const n1 = loop.partyIdentification?.[0];
        if (n1) {
            builder.addN1(n1.entityIdentifierCode, n1.name || '', n1.identificationCodeQualifier || '', n1.identificationCode);
        }
        // N3 would go here
        
        const n4 = loop.geographicLocation?.[0];
        if (n4) {
            builder.addN4(n4.cityName || '', n4.stateOrProvinceCode || '', n4.postalCode || '', n4.countryCode || '');
        }
    });

    // PO1 Loops
    input.P01Loop?.forEach((loop, index) => {
        const po1 = loop.baselineItemData?.[0];
        if (po1) {
           const lineNum = po1.assignedIdentification ? parseInt(po1.assignedIdentification) : index + 1;
           // addPO1(lineNum, qty, uom, price, sku)
           builder.addPO1(lineNum, po1.quantityOrdered, po1.unitOfMeasurementCode, po1.unitPrice || 0, po1.productServiceID || '');
           
           // PID/Description could be extracted if added to schema
        }
    });

    // CTT: Transaction Totals
    builder.addCTT(input.P01Loop?.length || 0);
  }
}
