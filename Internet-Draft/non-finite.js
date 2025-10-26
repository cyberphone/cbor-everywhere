'use strict';

function nonFinite2Cbor(value) {
  badValue:
    while (true) {
      if (value < 0n) break badValue;
      // Convert value into byte array 
      let array = [];
      let i = value;
      do {
        array.push(Number(i & 0xffn));
      } while (i >>= 8n);
      let ieee754 = new Uint8Array(array.reverse());
      // Verify that value is a valid non-finite number
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
      // Get sign bit
      let sign = ieee754[0] > 0x7f;
      // Try reducing value to next shorter variant if not aleady at 16 bits
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
      // Reductions done, return proper CBOR encoding
      let cbor = new Uint8Array(1 + ieee754.length);
      cbor.set(new Uint8Array([0xf9 + (ieee754.length >> 2)]));
      cbor.set(ieee754, 1);
      return cbor;
    }
  // Invalid argument
  throw new Error("Bad value: " + value);
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

function oneTurn(value, cborHexOrNull) {
  if (cborHexOrNull) {
    console.log(toHex(nonFinite2Cbor(value)) == cborHexOrNull ? "Success" : "***FAILED RUN***");
  } else {
    try {
      nonFinite2Cbor(value);
      console.log("***FAILED***");
    } catch (e) {
      console.log(e.toString().includes("Bad value") ? "Success" : "***FAILED EXCEPTION***");
    }
  }
}

oneTurn(0x7e00n, "f97e00");
oneTurn(0xfe00n, "f9fe00");
oneTurn(0x7ff0000000000000n, "f97c00");
oneTurn(0xfff0000000000000n, "f9fc00");
oneTurn(0x7ff8000000000000n, "f97e00");
oneTurn(0x7ff0000020000000n, "fa7f800001");
oneTurn(0xfff0000020000000n, "faff800001");
oneTurn(0x7ff0040000000000n, "f97c01");
oneTurn(0x7ff00000000000000n);
oneTurn(0x7800n);
oneTurn(0n);
//oneTurn(0x7e00);
