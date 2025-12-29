import { PurchaseOrderInput } from '../types';

export class Edi850Parser {
  public parse(x12: string): PurchaseOrderInput {
    // 1. Clean and split the file
    const rawSegments = x12.replace(/\n/g, '').split('~').map(s => s.trim()).filter(s => s.length > 0);

    const po: PurchaseOrderInput = {
      transactionSetHeader: [],
      beginningSegmentForPurchaseOrder: [],
      currency: [],
      referenceIdentification: [],
      administrativeCommunicationsContact: [],
      taxReference: [],
      fobRelatedInstructions: [],
      pricingInformation: [],
      periodAmount: [],
      salesRequirements: [],
      servicePromotionAllowanceChargeInformation: [],
      termsOfSaleDeferredTermsOfSale: [],
      dateTimeReference: [],
      carrierDetails: [],
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
          po.beginningSegmentForPurchaseOrder?.push({
              purchaseOrderTypeCode: elements[2],
              purchaseOrderNumber: elements[3],
              releaseNumber: elements[4],
              date: elements[5]
          });
          break;

        case 'CUR':
           po.currency?.push({
               entityIdentifierCode: elements[1],
               currencyCode: elements[2],
               exchangeRate: elements[3],
               entityIdentifierCode2: elements[4],
               currencyCode2: elements[5]
           });
           break;

        case 'REF':
           po.referenceIdentification?.push({
               referenceIdentificationQualifier: elements[1],
               referenceIdentification: elements[2],
               description: elements[3]
           });
           break;

        case 'PER':
           po.administrativeCommunicationsContact?.push({
               contactFunctionCode: elements[1],
               name: elements[2],
               communicationNumberQualifier: elements[3],
               communicationNumber: elements[4],
               communicationNumberQualifier2: elements[5],
               communicationNumber2: elements[6],
               communicationNumberQualifier3: elements[7],
               communicationNumber3: elements[8]
           });
           break;

        case 'TAX':
           po.taxReference?.push({
               taxIdentificationNumber: elements[1],
               locationQualifier: elements[2],
               locationIdentifier: elements[3]
           });
           break;

        case 'FOB':
           po.fobRelatedInstructions?.push({
               shipmentMethodOfPayment: elements[1],
               locationQualifier: elements[2],
               description: elements[3]
           });
           break;

        case 'CTP':
           po.pricingInformation?.push({
               classOfTradeCode: elements[1],
               priceIdentifierCode: elements[2],
               unitPrice: elements[3] ? parseFloat(elements[3]) : undefined,
               quantity: elements[4] ? parseFloat(elements[4]) : undefined,
               unitOfMeasurementCode: elements[5]
           });
           break;

        case 'PAM':
           po.periodAmount?.push({
               amountQualifierCode: elements[1],
               monetaryAmount: elements[2] ? parseFloat(elements[2]) : undefined,
               unitOfTimePeriodOrInterval: elements[3],
               dateTimeQualifier: elements[4],
               date: elements[5]
           });
           break;

        case 'CSH':
           po.salesRequirements?.push({
               salesRequirementCode: elements[1]
           });
           break;

        case 'SAC':
           po.servicePromotionAllowanceChargeInformation?.push({
               allowanceOrChargeIndicator: elements[1],
               servicePromotionAllowanceOrChargeCode: elements[2],
               amount: elements[5] ? parseFloat(elements[5]) : undefined
               // Note: Elements 3 & 4 (Agency, Agency Code) skipped in this simple parser
           });
           break;

        case 'ITD':
           po.termsOfSaleDeferredTermsOfSale?.push({
               termsTypeCode: elements[1],
               termsBasisDateCode: elements[2],
               termsDiscountPercent: elements[3] ? parseFloat(elements[3]) : undefined,
               termsDiscountDueDate: elements[4],
               termsDiscountDaysDue: elements[5] ? parseInt(elements[5]) : undefined,
               termsNetDueDate: elements[6],
               termsNetDays: elements[7] ? parseInt(elements[7]) : undefined,
               termsDiscountAmount: elements[8] ? parseFloat(elements[8]) : undefined
           });
           break;

        case 'DTM':
           po.dateTimeReference?.push({
               dateTimeQualifier: elements[1],
               date: elements[2],
               time: elements[3],
               timeCode: elements[4]
           });
           break;

        case 'TD5':
           po.carrierDetails?.push({
               routingSequenceCode: elements[1],
               identificationCodeQualifier: elements[2],
               identificationCode: elements[3],
               transportationMethodTypeCode: elements[4],
               routing: elements[5]
           });
           break;

        case 'N1': // Name Loop
          currentN1Loop = {
              partyIdentification: [{
                  entityIdentifierCode: elements[1],
                  name: elements[2],
                  identificationCodeQualifier: elements[3],
                  identificationCode: elements[4]
              }],
              geographicLocation: []
          };
          po.N1Loop?.push(currentN1Loop);
          break;

        case 'N4': // Geo
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
