// Minimal protobuf wire-format codec: just the varint and length-delimited
// types the LT protocol uses.

export const WireType = { Varint: 0, LengthDelimited: 2 } as const;

export class Writer {
  private bytes: number[] = [];

  varint(value: number | bigint): this {
    // int32/enum negatives are sign-extended to 64 bits, per the protobuf spec
    let v = BigInt.asUintN(64, BigInt(value));
    while (v >= 0x80n) {
      this.bytes.push(Number(v & 0x7fn) | 0x80);
      v >>= 7n;
    }
    this.bytes.push(Number(v));
    return this;
  }

  tag(field: number, wireType: number): this {
    return this.varint((field << 3) | wireType);
  }

  bytesField(field: number, data: Uint8Array): this {
    this.tag(field, WireType.LengthDelimited).varint(data.length);
    for (const b of data) this.bytes.push(b);
    return this;
  }

  finish(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

export interface RawField {
  field: number;
  wireType: number;
  /** varint value (wire type 0) */
  int?: bigint;
  /** payload (wire type 2) */
  bytes?: Uint8Array;
}

export function readVarint(buf: Uint8Array, pos: number): [bigint, number] {
  let result = 0n;
  let shift = 0n;
  for (;;) {
    if (pos >= buf.length) throw new Error("Truncated varint");
    const b = buf[pos++];
    result |= BigInt(b & 0x7f) << shift;
    if (!(b & 0x80)) return [result, pos];
    shift += 7n;
    if (shift > 63n) throw new Error("Varint too long");
  }
}

/** Split a message into its raw fields, in wire order. */
export function readFields(buf: Uint8Array): RawField[] {
  const out: RawField[] = [];
  let pos = 0;
  while (pos < buf.length) {
    const [key, p1] = readVarint(buf, pos);
    pos = p1;
    const field = Number(key >> 3n);
    const wireType = Number(key & 7n);
    switch (wireType) {
      case WireType.Varint: {
        const [int, p2] = readVarint(buf, pos);
        pos = p2;
        out.push({ field, wireType, int });
        break;
      }
      case WireType.LengthDelimited: {
        const [len, p2] = readVarint(buf, pos);
        const end = p2 + Number(len);
        if (end > buf.length) throw new Error("Truncated length-delimited field");
        out.push({ field, wireType, bytes: buf.subarray(p2, end) });
        pos = end;
        break;
      }
      case 1: // 64-bit
        pos += 8;
        break;
      case 5: // 32-bit
        pos += 4;
        break;
      default:
        throw new Error(`Unsupported wire type ${wireType}`);
    }
  }
  return out;
}
