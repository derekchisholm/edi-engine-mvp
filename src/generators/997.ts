import { X12Builder } from '../lib/x12-builder';

export interface AckInput {
  receivedControlNumber: string; // The GS control number we are acking
  accepted: boolean;
}

export class Edi997Generator {
  public generate(input: AckInput, sender: string, receiver: string): string {
    const builder = new X12Builder();
    const status = input.accepted ? 'A' : 'R';

    builder.addISA(sender, receiver);
    builder.addGS('FA', sender, receiver); // FA = Functional Acknowledgment

    // ST Header
    builder.addSegment('ST', '997', '0001');

    // AK1: Functional Group Response
    // Says: "I am responding to the group with ID [receivedControlNumber]"
    builder.addSegment('AK1', 'OW', input.receivedControlNumber);

    // AK9: Acknowledgement Header
    // A = Accepted, 1 = Number of transactions included
    builder.addSegment('AK9', status, '1', '1', '1');

    // Trailers
    builder.addSegment('SE', '4', '0001'); // 4 segments total (ST, AK1, AK9, SE)
    builder.addSegment('GE', '1', '1');
    builder.addSegment('IEA', '1', '000000001');

    return builder.toString();
  }
}