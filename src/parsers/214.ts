import { CarrierStatusOutput } from '../types';

export class Edi214Parser {
  public parse(x12: string): CarrierStatusOutput {
    const rawSegments = x12.replace(/\n/g, '').split('~').map(s => s.trim()).filter(s => s.length > 0);

    const status: CarrierStatusOutput = {
      shipmentId: '',
      carrierCode: '',
      statusDate: '',
      statusDetails: []
    };

    let currentStatusDetail: any = {};

    for (let i = 0; i < rawSegments.length; i++) {
      const elements = rawSegments[i].split('*');
      const tag = elements[0];

      switch (tag) {
        case 'B10': // Beginning Segment
          // B10*RefNum*ShipmentId*CarrierCode*...
          // Index might vary slightly based on standards version, but typically:
          // 1: Ref Num (Pro Number)
          // 2: Shipment ID (BOL)
          // 3: SCAC (Carrier Code)
          status.shipmentId = elements[2] || elements[1]; // Fallback
          status.carrierCode = elements[3];
          break;

        case 'LX': // Assigned Number (Loop Start)
          // New status detail loop
          currentStatusDetail = {};
          break;

        case 'AT7': // Shipment Status Details
          // AT7*StatusCode*Reason*...*Date*Time
          // 1: Status Code (X1, D1, etc.)
          // 5: Date (CCYYMMDD)
          // 6: Time (HHMM)
          if (!status.statusDate && elements[5]) {
             status.statusDate = elements[5]; // Use the first found date as main date if needed
             status.statusTime = elements[6];
          }
          
          currentStatusDetail.code = elements[1];
          // Store date/time specifically for this update if we were doing a more complex model
          break;

        case 'MS1': // Location
          // MS1*City*State*Country
          // 1: City
          // 2: State
          currentStatusDetail.city = elements[1];
          currentStatusDetail.state = elements[2];

          // Push to list if we have enough info
          if (currentStatusDetail.code) {
            status.statusDetails.push({
              code: currentStatusDetail.code,
              city: currentStatusDetail.city || '',
              state: currentStatusDetail.state || '',
              description: elements[1] // Just reusing city as desc for now if no specific desc field
            });
            currentStatusDetail = {}; // Reset
          }
          break;
          
        // Note: In real parsing, we'd handle the hierarchical loop structure more strictly.
      }
    }

    return status;
  }
}
