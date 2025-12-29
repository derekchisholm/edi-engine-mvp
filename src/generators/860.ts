import { X12Builder } from '../lib/x12-builder';
import { PurchaseOrderChangeInput } from '../types';

export class Edi860Generator {
  public generate(input: PurchaseOrderChangeInput, sender: string, receiver: string): string {
    const builder = new X12Builder();
    
    builder.addISA(sender, receiver);
    builder.addGS('PC', sender, receiver); // PC = Purchase Order Change

    // Transaction Header
    builder.addST('860');

    // BCH: Beginning Segment for Change
    // BCH*04*NE*PO123*RELEASE*20231027~
    builder.addBCH('04', 'NE', input.poNumber, input.changeDate, input.changeOrderNumber);

    // Loop N1: Name (If Ship To changed)
    if (input.shipTo) {
      builder.addN1('ST', input.shipTo.name, input.shipTo.code ? '92' : '', input.shipTo.code);
      if (input.shipTo.address1) builder.addN3(input.shipTo.address1, input.shipTo.address2);
      if (input.shipTo.city && input.shipTo.state && input.shipTo.zip) {
        builder.addN4(input.shipTo.city, input.shipTo.state, input.shipTo.zip, input.shipTo.country);
      }
    }

    // Loop POC: Item Changes
    input.items.forEach((item, index) => {
      const lineNum = item.lineNumber || (index + 1);
      // POC*LINENUM*CHANGECODE*QTY*QTYLEFT*UOM*PRICE*BASIS*VN*SKU
      builder.addPOC(lineNum, item.changeCode, item.quantity || 0, item.price || 0, item.sku);
    });

    // CTT: Transaction Totals
    builder.addCTT(input.items.length);

    // Trailers
    builder.addSE();
    builder.addGE();
    builder.addIEA();

    return builder.toString();
  }
}
