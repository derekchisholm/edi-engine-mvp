import { OrderInput } from './types';

// A simple helper to build segments cleanly
class SegmentBuilder {
  private tag: string;
  private elements: string[];

  constructor(tag: string) {
    this.tag = tag;
    this.elements = [];
  }

  // Add elements and handle empty/undefined values gracefully
  add(val: string): SegmentBuilder {
    this.elements.push(val || '');
    return this;
  }

  toString(): string {
    // Join tag + elements with '*' and end with '~'
    return `${this.tag}*${this.elements.join('*')}~`;
  }
}

export class Edi940Generator {
  public generate(order: OrderInput, senderId: string, receiverId: string): string {
    const segments: string[] = [];
    const date = '251225'; // YYMMDD (Mock)
    const time = '1200';   // HHMM (Mock)
    const longDate = '20251225';

    // --- 1. ISA Envelope (Interchange Control Header) ---
    // The "Box" the letter comes in. Fixed width fields are tricky, so we handle them carefully.
    const isa = new SegmentBuilder('ISA')
      .add('00').add('          ') // Auth
      .add('00').add('          ') // Security
      .add('ZZ').add(senderId.padEnd(15)) // Sender
      .add('ZZ').add(receiverId.padEnd(15)) // Receiver
      .add(date).add(time)
      .add('U').add('00401').add('000000001')
      .add('0').add('T').add('>');
    segments.push(isa.toString());

    // --- 2. GS Envelope (Functional Group Header) ---
    // The "Folder" inside the box.
    const gs = new SegmentBuilder('GS')
      .add('OW') // OW = Warehouse Shipping Order (940)
      .add(senderId)
      .add(receiverId)
      .add(longDate).add(time)
      .add('1').add('X').add('004010');
    segments.push(gs.toString());

    // --- 3. ST Envelope (Transaction Set Header) ---
    // The "Letter" itself.
    segments.push(new SegmentBuilder('ST').add('940').add('0001').toString());

    // --- 4. The Data (Business Logic) ---

    // W05 - Warehouse Shipment Identification
    segments.push(new SegmentBuilder('W05')
      .add('N') // Status: New
      .add(order.poNumber) 
      .toString()
    );

    // N1 - Ship To Name
    segments.push(new SegmentBuilder('N1')
      .add('ST')
      .add(order.shipTo.name)
      .toString()
    );

    // N3 - Address
    segments.push(new SegmentBuilder('N3')
      .add(order.shipTo.address)
      .toString()
    );

    // N4 - City, State, Zip
    segments.push(new SegmentBuilder('N4')
      .add(order.shipTo.city)
      .add(order.shipTo.state)
      .add(order.shipTo.zip)
      .toString()
    );

    // W01 - Line Items (Loop)
    order.items.forEach((item) => {
      segments.push(new SegmentBuilder('W01')
        .add(item.quantity.toString())
        .add('EA')
        .add('') // Empty placeholder
        .add('VN')
        .add(item.sku)
        .toString()
      );
    });

    // --- 5. Closing Tags (Footer) ---
    
    // SE - Transaction Set Trailer (Must count segments inside ST/SE)
    // We calculated segments.length - 2 (Exclude ISA and GS) + 1 (For the SE itself)
    const segmentCount = segments.length - 2 + 1; 
    segments.push(new SegmentBuilder('SE').add(segmentCount.toString()).add('0001').toString());

    // GE - Group Trailer
    segments.push(new SegmentBuilder('GE').add('1').add('1').toString());

    // IEA - Interchange Trailer
    segments.push(new SegmentBuilder('IEA').add('1').add('000000001').toString());

    return segments.join('\n'); // Join with newlines for readability, though X12 doesn't technically need them
  }
}