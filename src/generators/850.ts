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
       builder.addBEG('00', beg.purchaseOrderTypeCode, beg.purchaseOrderNumber, beg.date);
    }

    // CUR: Currency
    input.currency?.forEach(cur => {
        builder.addSegment('CUR', cur.entityIdentifierCode, cur.currencyCode, cur.exchangeRate, cur.entityIdentifierCode2, cur.currencyCode2);
    });

    // REF: Reference Identification
    input.referenceIdentification?.forEach(ref => {
        builder.addSegment('REF', ref.referenceIdentificationQualifier, ref.referenceIdentification, ref.description);
    });

    // PER: Administrative Communications Contact
    input.administrativeCommunicationsContact?.forEach(per => {
        builder.addSegment('PER', per.contactFunctionCode, per.name, per.communicationNumberQualifier, per.communicationNumber, per.communicationNumberQualifier2, per.communicationNumber2, per.communicationNumberQualifier3, per.communicationNumber3);
    });

    // TAX: Tax Reference
    input.taxReference?.forEach(tax => {
        builder.addSegment('TAX', tax.taxIdentificationNumber, tax.locationQualifier, tax.locationIdentifier);
    });

    // FOB: F.O.B. Related Instructions
    input.fobRelatedInstructions?.forEach(fob => {
        builder.addSegment('FOB', fob.shipmentMethodOfPayment, fob.locationQualifier, fob.description);
    });

    // CTP: Pricing Information
    input.pricingInformation?.forEach(ctp => {
        builder.addSegment('CTP', ctp.classOfTradeCode, ctp.priceIdentifierCode, ctp.unitPrice, ctp.quantity, ctp.unitOfMeasurementCode);
    });

    // PAM: Period Amount
    input.periodAmount?.forEach(pam => {
        builder.addSegment('PAM', pam.amountQualifierCode, pam.monetaryAmount, pam.unitOfTimePeriodOrInterval, pam.dateTimeQualifier, pam.date);
    });

    // CSH: Sales Requirements
    input.salesRequirements?.forEach(csh => {
        builder.addSegment('CSH', csh.salesRequirementCode);
    });

    // SAC: Service, Promotion, Allowance, or Charge Information
    input.servicePromotionAllowanceChargeInformation?.forEach(sac => {
        builder.addSegment('SAC', sac.allowanceOrChargeIndicator, sac.servicePromotionAllowanceOrChargeCode, '', '', sac.amount); // Note: Skipping optional elements between code and amount for simplicity based on schema
    });

    // ITD: Terms of Sale/Deferred Terms of Sale
    input.termsOfSaleDeferredTermsOfSale?.forEach(itd => {
        builder.addSegment('ITD', itd.termsTypeCode, itd.termsBasisDateCode, itd.termsDiscountPercent, itd.termsDiscountDueDate, itd.termsDiscountDaysDue, itd.termsNetDueDate, itd.termsNetDays, itd.termsDiscountAmount);
    });

    // DTM: Date/Time Reference
    input.dateTimeReference?.forEach(dtm => {
        builder.addSegment('DTM', dtm.dateTimeQualifier, dtm.date, dtm.time, dtm.timeCode);
    });

    // TD5: Carrier Details
    input.carrierDetails?.forEach(td5 => {
        builder.addSegment('TD5', td5.routingSequenceCode, td5.identificationCodeQualifier, td5.identificationCode, td5.transportationMethodTypeCode, td5.routing);
    });

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
