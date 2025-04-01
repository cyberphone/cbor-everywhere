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
  <tr><th align="center">Diagnostic&nbsp;Notation</th>
  <th align="center">CBOR&nbsp;Encoding</th>
  <th align="center">Comment</th></tr>
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
  let text = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-"-';
  oneTurn("-0.0000033333333333333333", "fbbecbf647612f3696", "Randomly selected number");
  oneTurn("10.559998512268066", "fa4128f5c1", text);
  oneTurn("10.559998512268068", "fb40251eb820000001", "Next in succession");

  oneTurn("295147905179352830000.0", "fa61800000", codeWord("2<sup>68</sup>") +
    " (diagnostic notation truncates precision)");
  
  oneTurn("2.0", "f94000", "Number without a fractional part");

  oneTurn("-5.960464477539063e-8", "f98001", "Smallest negative " +
    emphasize("subnormal") + " 16-bit " + codeWord("float"));
  oneTurn("-5.960464477539062e-8", "fbbe6fffffffffffff", "Adjacent smallest negative " +
    emphasize("subnormal") + " 16-bit " + codeWord("float"));
  oneTurn("-5.960464477539064e-8", "fbbe70000000000001", text);
  oneTurn("-5.960465188081798e-8", "fab3800001", text);

  oneTurn("0.0000609755516052246", "fb3f0ff7ffffffffff", "Adjacent largest " +
    emphasize("subnormal") + " 16-bit " + codeWord("float"));
  oneTurn("0.000060975551605224616", "fb3f0ff80000000001", text);
  oneTurn("0.000060975555243203416", "fa387fc001", text);

  oneTurn("0.00006103515624999999", "fb3f0fffffffffffff", "Adjacent smallest 16-bit " +
     codeWord("float"));
  oneTurn("0.00006103515625000001", "fb3f10000000000001", text);
  oneTurn("0.00006103516352595761", "fa38800001", text);
  
  oneTurn("65503.99999999999", "fb40effbffffffffff", "Adjacent largest 16-bit " +
     codeWord("float"));
  oneTurn("65504.00000000001", "fb40effc0000000001", text);
  oneTurn("65504.00390625", "fa477fe001", text);
  
  oneTurn("1.4012984643248169e-45", "fb369fffffffffffff", "Adjacent smallest " +
      emphasize("subnormal") + " 32-bit " + codeWord("float"));
  oneTurn("1.4012984643248174e-45", "fb36a0000000000001", text);
  oneTurn("1.175494210692441e-38", "fb380fffffbfffffff", "Adjacent largest " +
      emphasize("subnormal") + " 32-bit " + codeWord("float"));
  oneTurn("1.1754942106924412e-38", "fb380fffffc0000001", text);

  oneTurn("1.1754943508222874e-38", "fb380fffffffffffff", "Adjacent smallest 32-bit " +
     codeWord("float"));
  oneTurn("1.1754943508222878e-38", "fb3810000000000001", text);
  oneTurn("3.4028234663852882e+38", "fb47efffffdfffffff", "Adjacent largest 32-bit " +
     codeWord("float"));
  oneTurn("3.402823466385289e+38", "fb47efffffe0000001", text);
}

table += rfcMode ? '</tbody>\n</table>\n' : "hh";
console.log("\n" + table + "\n");
