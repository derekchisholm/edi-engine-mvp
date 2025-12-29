export class X12Segment {
  private tag: string;
  private elements: string[];

  constructor(tag: string) {
    this.tag = tag;
    this.elements = [];
  }

  add(val: string | number | undefined | null): X12Segment {
    if (val === undefined || val === null) {
      this.elements.push('');
    } else {
      this.elements.push(val.toString());
    }
    return this;
  }

  toString(terminator: string = '~', separator: string = '*'): string {
    // Trim trailing empty elements to keep it clean, but X12 requires exact positions for some.
    // Ideally we don't trim arbitrarily, but for MVP strict ordered add() is best.
    // If we wanted to trim trailing separators:
    // while (this.elements.length > 0 && this.elements[this.elements.length - 1] === '') {
    //   this.elements.pop();
    // }
    return `${this.tag}${separator}${this.elements.join(separator)}${terminator}`;
  }
}

export class X12Builder {
  private segments: string[] = [];
  private currentSegmentCount: number = 0;

  // ---------------------------------------------------------------------------
  // Envelope Headers
  // ---------------------------------------------------------------------------
  addISA(sender: string, receiver: string, controlNum: string = '000000001', testIndicator: string = 'P'): this {
    const date = new Date().toISOString().slice(2, 8).replace(/-/g, ''); // YYMMDD
    const time = new Date().toISOString().slice(11, 16).replace(/:/g, ''); // HHMM
    
    // ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *YYMMDD*HHMM*U*00401*000000001*0*T*>~
    this.segments.push(new X12Segment('ISA')
      .add('00').add('          ')
      .add('00').add('          ')
      .add('ZZ').add(sender.padEnd(15, ' '))
      .add('ZZ').add(receiver.padEnd(15, ' '))
      .add(date).add(time)
      .add('U').add('00401').add(controlNum)
      .add('0').add(testIndicator).add('>')
      .toString()
    );
    return this;
  }

  addGS(functionalId: string, sender: string, receiver: string, controlNum: string = '1'): this {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // CCYYMMDD
    const time = new Date().toISOString().slice(11, 16).replace(/:/g, ''); // HHMM

    this.segments.push(new X12Segment('GS')
      .add(functionalId)
      .add(sender).add(receiver)
      .add(date).add(time)
      .add(controlNum).add('X').add('004010')
      .toString()
    );
    return this;
  }

  addST(transId: string, controlNum: string = '0001'): this {
    this.currentSegmentCount = 0; // Reset
    this.addSegment('ST', transId, controlNum);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Common Segments
  // ---------------------------------------------------------------------------

  // 850 Beginning Segment
  addBEG(type: string = '00', poType: string = 'NE', poNumber: string, date: string = ''): this {
    const d = date ? date.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
    // BEG*00*NE*PO123**20231027~
    return this.addSegment('BEG', type, poType, poNumber, '', d);
  }

  // 860 Beginning Segment for Change
  addBCH(type: string = '04', poType: string = 'NE', poNumber: string, date: string = '', changeOrderNum: string = ''): this {
     const d = date ? date.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
     // BCH*04*NE*PO123*RELEASE*20231027~
     return this.addSegment('BCH', type, poType, poNumber, changeOrderNum, d);
  }

  addN1(type: string, name: string, idQual: string = '', id: string = ''): this {
    // N1*ST*Ship To Name*92*1234~
    return this.addSegment('N1', type, name, idQual, id);
  }

  addN3(address1: string, address2: string = ''): this {
    return this.addSegment('N3', address1, address2);
  }

  addN4(city: string, state: string, zip: string, country: string = ''): this {
    return this.addSegment('N4', city, state, zip, country);
  }

  addPO1(lineNum: string | number, quantity: number, uom: string, price: number, sku: string): this {
    // PO1*1*10*EA*15.50**VN*SKU123~
    // Note: Standard typically expects basis of unit price (e.g. 'PE') or just price.
    // PO1*LINENUM*QTY*UOM*PRICE*BASIS*IDQUAL*ID...
    return this.addSegment('PO1', lineNum, quantity, uom, price, '', 'VN', sku);
  }

  addPOC(lineNum: string | number, changeCode: string, quantity: number, price: number, sku: string): this {
      // POC*LINENUM*CHANGECODE*QTY*QTYLEFT*UOM*PRICE*BASIS*VN*SKU
      // Simplified: POC*1*CA*10*0*EA*15.50**VN*SKU123
      return this.addSegment('POC', lineNum, changeCode, quantity, '0', 'EA', price, '', 'VN', sku);
  }

  addCTT(lineCount: number): this {
    return this.addSegment('CTT', lineCount);
  }

  // ---------------------------------------------------------------------------
  // Envelope Trailers
  // ---------------------------------------------------------------------------
  
  addSE(controlNum: string = '0001'): this {
    this.currentSegmentCount++; // Count SE itself
    this.segments.push(new X12Segment('SE')
      .add(this.currentSegmentCount).add(controlNum)
      .toString()
    );
    return this;
  }

  addGE(controlNum: string = '1'): this {
    this.segments.push(new X12Segment('GE').add('1').add(controlNum).toString());
    return this;
  }

  addIEA(controlNum: string = '000000001'): this {
    this.segments.push(new X12Segment('IEA').add('1').add(controlNum).toString());
    return this;
  }

  // ---------------------------------------------------------------------------
  // Core
  // ---------------------------------------------------------------------------
  addSegment(tag: string, ...elements: (string | number | undefined | null)[]): this {
    const seg = new X12Segment(tag);
    elements.forEach(e => seg.add(e));
    this.segments.push(seg.toString());
    this.currentSegmentCount++;
    return this;
  }

  toString(): string {
    return this.segments.join('\n');
  }
}
