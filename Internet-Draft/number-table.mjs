// int-table.mjs
"use strict";

import { argv, exit } from 'node:process';
import CBOR from '../../CBOR.js/npm/mjs/index.mjs';
let args = process.argv.slice(2);
if (args.length != 2 ||
   !(args[0] == "RFC" || args[0] == "HTML") ||
   !(args[1] == "INT" || args[1] == "FLOAT")) {
  console.log("arguments: RFC|HTML INT|FLOAT");
  exit();
}
let rfcMode = args[0] == "RFC";
let intMode = args[1] == "INT";
console.log("Mode: " + args[0]);

let table = rfcMode ? "<table>\n<name>" + (intMode ? "Integers" : "Floating Point Numbers") + 
`</name>
<thead>
  <tr><th align="center">Value</th>
  <th align="center">CBOR Encoding</th>
  <th align="center">Note</th></tr>
</thead>
<tbody>\n`: `<table>`;

function oneTurn(numberText, cborHex, comment) {
  let cbor = CBOR.diagDecode(numberText);
  if (cbor.toString() != numberText) {
    throw numberText;
  }
  let bin = CBOR.decode(CBOR.fromHex(cborHex));
  if (CBOR.compareArrays(bin.encode(), cbor.encode())) {
    throw cborHex;
  }
  table += rfcMode ? '<tr><td align="right"><tt>' +
  numberText +
  '</tt></td>\n<td align="right"><tt>' + cborHex +
  '</tt></td>\n<td>' + comment + '</td></tr>\n': "gg"; 
}

function codeWord(word) {
  return rfcMode ? "<tt>" + word + "</tt>" : "<code>" + word + "</code>";
}

function emphasize(word) {
  return rfcMode ? "<em>" + word + "</em>" : "<i>" + word + "</i>";
}

function intGen(largeFlag, value) {
  let cborObject = CBOR.BigInt(value);
  let cbor = cborObject.encode();
  let size = " implicit";
  let type = "int";
  switch (cbor.length) {
    case 2:
      size = " one-byte";
      break;
    case 3:
      size = " two-byte";
     break;
    case 5:
      size = " four-byte";
      break;
    case 9:
      size = " eight-byte";
      break;
    case 11:
      size = "";
      type = "bigint";
  }
  let comment = (largeFlag ? "Largest" : "Smallest") + " " +
      (value < 0n ? "negative" : "positive") + size + " " + codeWord(type);
  oneTurn(cborObject.toString(), CBOR.toHex(cbor), comment);
}

let largest = false;

function intGenBase(value) {
  intGen(largest, value);
  intGen(largest, -value - 1n);
  largest = !largest;
}

function floatGen(size, value, largest, subnormal) {
  let tag = 0xf9;
  let i = size;
  while (!(i & 2)) {
    i >>= 1;
    tag++;
  }
  let encoding = [];
  for (i = 0; i < size; i++) {
    encoding.push(Number(value & 255n));
    value >>= 8n;
  }
  encoding.push(tag);
  let cbor = CBOR.decode(new Uint8Array(encoding.reverse()));
//  console.log(cbor.toString());
   oneTurn(cbor.toString(), CBOR.toHex(encoding), (largest ? "Largest" : "Smallest") +
       " positive " + (subnormal ? emphasize('subnormal') + " ": "") +
      (size * 8) + "-bit " + codeWord('float'));
}

function floatGenBase(size, exponentSize, offset) {
  floatGen(size, 1n, false, true);
  floatGen(size, offset - 1n, true, true);
  floatGen(size, offset, false, false);
  let exponent = 0n;
  for (let i = 1; i < exponentSize; i++) {
    exponent |= 1n;
    exponent <<= 1n;
  }
  floatGen(size, (exponent * offset) + offset - 1n, true, false);
}

if (intMode) {
  intGenBase(0n);
  intGenBase(23n);
  intGenBase(24n);
  let value = 256n;
  for (let i = 0; i < 4; i++) {
    intGenBase(value - 1n);
    intGenBase(value);
    value *= value;
  }
} else {
  oneTurn("0.0", "f90000", "Zero");
  oneTurn("-0.0", "f98000", "Negative zero");
  oneTurn("Infinity", "f97c00", "Infinity");
  oneTurn("-Infinity", "f9fc00", "-Infinity");
  oneTurn("NaN", "f97e00", "NaN");
  floatGenBase(2, 5, 0x400n);
  floatGenBase(4, 8, 0x800000n);
  floatGenBase(8, 11, 0x10000000000000n);
  let text = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;""';
  oneTurn("-0.0000033333333333333333", "fbbecbf647612f3696", "Randomly selected number");
  oneTurn("-5.960464477539062e-8", "fbbe6fffffffffffff", "Series of close numbers");
  oneTurn("-5.960464477539063e-8", "f98001", text);
  oneTurn("-5.960464477539064e-8", "fbbe70000000000001", text);
  oneTurn("-5.960465188081798e-8", "fab3800001", text);
}

table += rfcMode ? '</tbody>\n</table>\n' : "hh";
console.log("\n" + table + "\n");
