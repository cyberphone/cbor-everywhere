// hmac.mjs
import CBOR from 'cbor-object';
const crypto = await import('node:crypto');

// CSF constants
const CSF_ALG_LBL = CBOR.Int(1);
const CSF_SIG_LBL = CBOR.Int(6);

// COSE => Node.js algorithm translation
const HASH_ALGORITHMS = new Map()
    .set(5, "sha256").set(6, "sha384").set(7, "sha512");

function hmac(coseAlg, key, data) {
    let alg = HASH_ALGORITHMS.get(coseAlg);
    if (alg === undefined) throw "Unknown alg: " + coseAlg;
    return crypto.createHmac(alg, key).update(data).digest();
}

const SHARED_KEY = crypto.createSecretKey(
    '7fdd851a3b9d2dafc5f0d00030e22b9343900cd42ede4948568a4a2ee655291a', 'hex');

const APP_P1_LBL  = CBOR.Int(1);                   // Application label
const APP_P2_LBL  = CBOR.Int(2);                   //        ""
const APP_CSF_LBL = CBOR.Int(-1);                  // Where to put the
                                                   // CSF container
////////////////////////////////////
// Create an unsigned CBOR object //
////////////////////////////////////
let object = CBOR.Map()
    .set(APP_P1_LBL, CBOR.String("data"))          // Application data
    .set(APP_P2_LBL, CBOR.String("more data"));    //        ""

////////////////////////////////////////
// Add a signature to the CBOR object //
////////////////////////////////////////
const COSE_ALG = 5;                                // Selected HMAC algorithm

let csf = CBOR.Map()                               // Create CSF container and
    .set(CSF_ALG_LBL, CBOR.Int(COSE_ALG));         // add COSE algorithm to it
object.set(APP_CSF_LBL, csf);                      // Add CSF container to object
let sig = hmac(COSE_ALG,                           // Generate signature over
               SHARED_KEY,                         // the current object
               object.encode());                   // encode(): all we got so far
csf.set(CSF_SIG_LBL, CBOR.Bytes(sig));             // Add signature to CSF container
let cborBinary = object.encode();                  // Return CBOR as an Uint8Array
        
console.log(object.toString());                    // Show in Diagnostic Notation

/////////////////////////////////////
// Validate the signed CBOR object //
/////////////////////////////////////
object = CBOR.decode(cborBinary);                  // Decode CBOR object
csf = object.get(APP_CSF_LBL);                     // Get CSF container
let alg = csf.get(CSF_ALG_LBL).getInt();           // Get COSE algorithm
let readSig = csf.remove(CSF_SIG_LBL).getBytes();  // Get and REMOVE signature value
let actualSig = hmac(alg,                          // Calculate signature over
                     SHARED_KEY,                   // the current object
                     object.encode());             // encode(): all but the signature
if (CBOR.compareArrays(readSig, actualSig)) {      // HMAC validation
    throw "Signature did not validate";
}
// Validated object, access the "payload":
let p1 = object.get(APP_P1_LBL).getString();       // p1 should now contain "data"