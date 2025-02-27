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

let table = rfcMode ? "<table>\n<name>" + (intMode ? "Integers" : "Floating Point") + 
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
  if (rfcMode) {
    type = "<tt>" + type + "</tt>";
  }
  let comment = (largeFlag ? "Largest" : "Smallest") + " " +
      (value < 0n ? "negative" : "positive") + size + " " + type;
  oneTurn(cborObject.toString(), CBOR.toHex(cbor), comment);
}

if (intMode) {
  let value = 1n;
  for (let i = 0; i < 8; i++) {
    let largest = i & 1;
    intGen(largest, value - 1n);
    intGen(largest, -value);
    if (i == 0) {
      value = 24n;
    } else if (i == 1) {
      value = 25n;
    } else if (i == 2) {
      value = 256n;
    } else if (i == 6) {
      value++;
    } else {
      value *= value;
    }
  }
}

table += rfcMode ? '</tbody>\n</table>\n' : "hh";
console.log("\n" + table + "\n");
