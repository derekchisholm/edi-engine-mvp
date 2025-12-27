export class X12Segment {
  private tag: string;
  private elements: string[];

  constructor(tag: string) {
    this.tag = tag;
    this.elements = [];
  }

  add(val: string | undefined | null): X12Segment {
    this.elements.push(val || '');
    return this;
  }

  toString(terminator: string = '~', separator: string = '*'): string {
    return `${this.tag}${separator}${this.elements.join(separator)}${terminator}`;
  }
}

export class X12Builder {
  private segments: string[] = [];
  
  // Helpers for standard envelopes
  addISA(sender: string, receiver: string, controlNum: string = '000000001'): this {
    const date = new Date().toISOString().slice(2, 8).replace(/-/g, ''); // YYMMDD
    const time = new Date().toISOString().slice(11, 16).replace(/:/g, ''); // HHMM
    
    this.segments.push(new X12Segment('ISA')
      .add('00').add('          ')
      .add('00').add('          ')
      .add('ZZ').add(sender.padEnd(15))
      .add('ZZ').add(receiver.padEnd(15))
      .add(date).add(time)
      .add('U').add('00401').add(controlNum)
      .add('0').add('T').add('>')
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

  addSegment(tag: string, ...elements: string[]): this {
    const seg = new X12Segment(tag);
    elements.forEach(e => seg.add(e));
    this.segments.push(seg.toString());
    return this;
  }

  toString(): string {
    // Auto-calculate trailers
    // Note: In a real robust engine, you'd track ST/GS counts dynamically.
    // For MVP, we assume 1 Group and 1 Transaction per file.
    return this.segments.join('\n');
  }
}