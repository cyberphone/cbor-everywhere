'use strict';
// Input: 16, 32, or 64-bit non-finite number in a BigInt.
// Returns: CBOR binary in a Uint8Array.
function nonFinite2Cbor(value) {
  // Errors force execution to the statement after the while-loop.
  badValue:
    while (true) {
      if (value < 0n) break badValue;
      // Convert the value into a byte array.
      let array = [];
      let i = value;
      do {
        array.push(Number(i & 0xffn));
      } while (i >>= 8n);
      let ieee754 = new Uint8Array(array.reverse());
      // Verify that the value is a valid non-finite number.
      let exponent;
      switch (ieee754.length) {
        case 2:
          exponent = 0x7c00n;
          break;
        case 4:
          exponent = 0x7f800000n;
          break;
        case 8:
          exponent = 0x7ff0000000000000n;
          break;
        default:
          break badValue;
      }
      if ((value & exponent) != exponent) break badValue;
      // Get sign bit.
      let sign = ieee754[0] > 0x7f;
      // If not already a 16-bit value, try reducing 
      // the value to the next shorter variant.
      // This done by testing if a right-shift to the
      // next shorter variant would lead to lost bits
      // in the significand.  If there would be lost bits,
      // the process terminates (break), otherwise the shift is
      // performed. Next all but the sign bit is masked away.
      // This also sets the exponent to the correct value for
      // the shorter variant.  Finally, the sign bit is
      // restored and the process is restarted.
      switch (ieee754.length) {
        case 4:
          if (value & ((1n << 13n) - 1n)) break;
          value >>= 13n;
          value &= 0x7fffn;
          if (sign) value |= 0x8000n;
          continue;
        case 8:
          if (value & ((1n << 29n) - 1n)) break;
          value >>= 29n;
          value &= 0x7fffffffn;
          if (sign) value |= 0x80000000n;
          continue;
      }
      // Reductions done, return proper CBOR encoding.
      let cbor = new Uint8Array(1 + ieee754.length);
      cbor.set(new Uint8Array([0xf9 + (ieee754.length >> 2)]));
      cbor.set(ieee754, 1);
      return cbor;
    }
  // Invalid argument.
  throw new Error("Invalid non-finite number: " + value);
}

// Input: up to 53 bit payload as a BigInt.
// Returns: CBOR binary in a Uint8Array.
function payload2Cbor(payload) {
  if (payload < 0n || payload > 0x1fffffffffffffn) {
    throw new Error("Invalid payload: " + payload);
  }
  // Catch sign (b52).
  let left64 = (payload & 0x10000000000000n) ?
                         0xfff0000000000000n : 0x7ff0000000000000n;
  // Remove possible sign (b52) from b51-b0.
  payload &= 0xfffffffffffffn;
  // Reverse bits b51-b0.
  let reversed = 0n;
  for (let i = 0; i < 52; i++) {
    reversed <<= 1n;
    reversed |= payload & 1n;
    payload >>= 1n;
  }
  // Create 64-bit IEEE-754 object.
  // Then apply deterministic encoding.
  return nonFinite2Cbor(left64 + reversed);
}


// Testing"

function oneHex(digit) {
  return String.fromCharCode(digit < 10 ? (0x30 + digit) : (0x57 + digit));
}

function twoHex(byte) {
  return oneHex(byte / 16) + oneHex(byte % 16);
}

function toHex(byteArray) {
  let result = '';
  byteArray.forEach((element) => {
    result += twoHex(element);
  });
  return result;
}

function doNonFinite(value, cborHexOrNull) {
  if (cborHexOrNull) {
    console.log(toHex(nonFinite2Cbor(value)) == cborHexOrNull ? "Success" : "***FAILED RUN***");
  } else {
    try {
      nonFinite2Cbor(value);
      console.log("***FAILED***");
    } catch (e) {
      console.log(e.toString().includes("Invalid non-finite") ? "Success" : "***FAILED EXCEPTION***");
    }
  }
}

function doPayload(value, cborHexOrNull) {
  if (cborHexOrNull) {
    console.log(toHex(payload2Cbor(value)) == cborHexOrNull ? "Success" : "***FAILED RUN***");
  } else {
    try {
      payload2Cbor(value);
      console.log("***FAILED***");
    } catch (e) {
      console.log(e.toString().includes("Invalid payload") ? "Success" : "***FAILED EXCEPTION***");
    }
  }
}

doNonFinite(0x7e00n, "f97e00");
doNonFinite(0xfe00n, "f9fe00");
doNonFinite(0x7ff0000000000000n, "f97c00");
doNonFinite(0xfff0000000000000n, "f9fc00");
doNonFinite(0x7ff8000000000000n, "f97e00");
doNonFinite(0x7ff0000020000000n, "fa7f800001");
doNonFinite(0xfff0000020000000n, "faff800001");
doNonFinite(0x7ff0040000000000n, "f97c01");
doNonFinite(0x7ff00000000000000n);
doNonFinite(0x7800n);
doNonFinite(0n);
//doNonFinite(0x7e00);

doPayload(0n, "f97c00");
doPayload(1n, "f97e00");
doPayload(2n, "f97d00");
doPayload(0x3ffn, "f97fff");
doPayload(0x400n, "fa7f801000");
doPayload(0x7fffffn, "fa7fffffff");
doPayload(0x800000n, "fb7ff0000010000000");
doPayload(0x10000000000400n, "faff801000");
doPayload(0x100000000003ffn, "f9ffff");
doPayload(0x100000007fffffn, "faffffffff");
doPayload(0xfffffffffffffn, "fb7fffffffffffffff");
doPayload(0x10000000000000n, "f9fc00");
doPayload(0x1fffffffffffffn, "fbffffffffffffffff");
doPayload(0x20000000000000n);
doPayload(-1n);
