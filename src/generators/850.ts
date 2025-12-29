import { X12Builder } from '../lib/x12-builder';
import { PurchaseOrderInput, PurchaseOrderPayload } from '../types';

export class Edi850Generator {
  public generate(input: PurchaseOrderPayload, sender: string, receiver: string): string {
    const builder = new X12Builder();
    
    builder.addISA(sender, receiver);
    builder.addGS('PO', sender, receiver); // PO = Purchase Order

    input.transactionSets.forEach((po, index) => {
      const controlNumber = (index + 1).toString().padStart(4, '0');
      
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
    builder.addBEG('00', input.type, input.poNumber, input.poDate);

    // Loop N1: Name
    // Ship To (ST)
    if (input.shipTo) {
      builder.addN1('ST', input.shipTo.name, input.shipTo.code ? '92' : '', input.shipTo.code);
      if (input.shipTo.address1) builder.addN3(input.shipTo.address1, input.shipTo.address2);
      if (input.shipTo.city && input.shipTo.state && input.shipTo.zip) {
        builder.addN4(input.shipTo.city, input.shipTo.state, input.shipTo.zip, input.shipTo.country);
      }
    }

    // Bill To (BT)
    if (input.buyer) {
        builder.addN1('BT', input.buyer.name, input.buyer.code ? '92' : '', input.buyer.code);
        if (input.buyer.address1) builder.addN3(input.buyer.address1, input.buyer.address2);
        if (input.buyer.city && input.buyer.state && input.buyer.zip) {
            builder.addN4(input.buyer.city, input.buyer.state, input.buyer.zip, input.buyer.country);
        }
    }

    // Vendor (VN)
    if (input.vendor) {
        builder.addN1('VN', input.vendor.name, input.vendor.code ? '92' : '', input.vendor.code);
        if (input.vendor.address1) builder.addN3(input.vendor.address1, input.vendor.address2);
        if (input.vendor.city && input.vendor.state && input.vendor.zip) {
            builder.addN4(input.vendor.city, input.vendor.state, input.vendor.zip, input.vendor.country);
        }
    }

    // Loop PO1: Items
    input.items.forEach((item, index) => {
      const lineNum = item.lineNumber || (index + 1);
      builder.addPO1(lineNum, item.quantity, item.uom, item.price || 0, item.sku);
      
      // PID could go here for description
      if (item.description) {
          builder.addSegment('PID', 'F', '', '', '', item.description);
      }
    });

    // CTT: Transaction Totals
    builder.addCTT(input.items.length);
  }
}
