// hmac.mjs
import CBOR from 'cbor-object';
const crypto = await import('node:crypto');

// CSF constants
const CSF_ALG_LBL = CBOR.Int(1);
const CSF_SIG_LBL = CBOR.Int(6);

// COSE => Node.js algorithm translation
const HASH_ALGORITHMS = new Map()
    .set(5, "sha256") .set(6, "sha384").set(7, "sha512");

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
const COSE_ALG = 5;                                // Selected algorithm

let csf = CBOR.Map()                               // Create CSF container
    .set(CSF_ALG_LBL, CBOR.Int(COSE_ALG));         // Add algorithm
object.set(APP_CSF_LBL, csf);                      // Add CSF container to object
// Generate signature and add it to the CSF container
csf.set(CSF_SIG_LBL, CBOR.Bytes(hmac(COSE_ALG, SHARED_KEY, object.encode())));
let cborBinary = object.encode();                  // Uint8Array
        
console.log(object.toString());                    // Show in Diagnostic Notation

/////////////////////////////////////
// Validate the signed CBOR object //
/////////////////////////////////////
object = CBOR.decode(cborBinary);                  // Decode
csf = object.get(APP_CSF_LBL);                     // Get CSF container
let alg = csf.get(CSF_ALG_LBL).getInt();           // Get COSE algorithm
let sig = csf.remove(CSF_SIG_LBL).getBytes();      // Get and remove signature value
let res = hmac(alg, SHARED_KEY, object.encode());  // Note that object.encode()
                                                   // reserializes all but sig.
if (CBOR.compareArrays(res, sig)) {
    throw "Didn't validate";
}
// Validated object, access the "payload":
let p1 = object.get(APP_P1_LBL).getString();       // p1 should now contain "data"