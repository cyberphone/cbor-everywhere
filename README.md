![This is an image](https://cyberphone.github.io/cbor-everywhere/cborlogo2.svg)
# CBOR Everywhere

*This document contains information and links to information resources which describe
how application builders can take advantage of the unique
qualities of [CBOR](https://www.rfc-editor.org/rfc/rfc8949.html).
The target audience for this document are developers who currently
use [JSON](https://www.rfc-editor.org/rfc/rfc8259) or
[XML](https://www.w3.org/XML/).*

## Notation
For readability reasons, the CBOR examples in this document are provided
in a textual format known as 
[diagnostic notation](https://www.rfc-editor.org/rfc/rfc8949#name-diagnostic-notation),
rather than the actual CBOR binary code.
Using diagnostic notation is an established method for *logging* CBOR data.

Aided by a suitable parser, diagnostic notation also makes *configuration
files* in CBOR fully comparable to JSON.

## Support for Binary Data
One of the more useful features of CBOR is the ability representing binary data
"as is".  Using XML or JSON, binary data must be encoded
as [Base64](https://www.rfc-editor.org/rfc/rfc4648), leading to
a 33% size increase as well as requiring additional processing.

See also [CBOR Mime Type](#cbor-mime-type).

## URL Based Object Identifiers
JSON, XML, and particularly XML Schema (XSD) based designs, typically
use URLs as object identifiers.
To ease the conversion from JSON and XML, a compatible
**C**BOR&nbsp;**O**bject&nbsp;**T**ype&nbsp;e**X**tension
([COTX](https://www.ietf.org/archive/id/draft-rundgren-cotx-03.html))
construct has been defined.  Sample:

```
1010(["https://example.com/myobject", {
  1: "data",
  2: "more data"
}])
```
`1010` is a special purpose (dedicated) CBOR tag.

Through the use of top-level COTX identifiers, a *single* processor,
HTTP end-point, or database column, may deal with *multiple* object types.
This arrangement also makes *object embedding* in other CBOR or non-CBOR data
less cumbersome, since the COTX identifier indicates which kind of object
that has been encountered.

## Deterministic Serialization
Unlike XML and JSON, CBOR supports deterministic serialization.
In addition to reducing the scope of interoperability testing, 
deterministic serialization also produces shortest possible CBOR data.

### Sorted Maps
Through deterministic serialization, CBOR map keys are by
default *sorted*, making debug and documentation easier.
By using CBOR integers as map keys, mapped arguments can be
positioned in the (for the application), most logical place.

The sorting also simplifies decoders since the only
specific test needed for map keys, is that they are
stored in a *lexicographically ascending order*. 

### Cryptographic Operations
Since deterministic serialization eliminates potentially
error-prone canonicalization steps, it may also be used
to represent signed data in a more efficient way than 
[JWS](https://www.rfc-editor.org/rfc/rfc7515.html),
while maintaining the structure of unsigned data unchanged.
Unsigned sample data:

```
{
  1: "data",
  2: "more data"
}
```
After applying a *hypothetical* signature scheme:

```
{
  1: "data",
  2: "more data",
  -1: {
    1: 5,
    6: h'4853d7730cc1340682b1748dc346cf627a5e91ce62c67fff15c40257ed2a37a1'
  }
}
```
Map key **-1** holds a signature container map which in turn features
a signature algorithm identifier (**5**) and signature data (**h'4853...**).
The signature would be created by the following steps:
- Add an empty signature container map to the unsigned data
- Add signature algorithm and associated *fixed* key (**1**)
to the signature container map
- *Optional*. Add other signature meta data to the signature container map
- Create signature data by calling a signature method with the following arguments:
    - the *signature key* (a symmetric or private key)
    - the signature algorithm
    - the deterministic serialization of the current CBOR data item
- Add the resulting signature data and associated *fixed* key (**6**)
to the signature container map

Verification is performed by the following steps:
- Read the signature algorithm from the signature container map
- Read the signature data from the signature container map
- Remove the signature data and associated key (**6**) from the signature container map
- Verify the signature by calling a signature verification method with the following arguments:
    - the *signature verification key* (implicit in this particular case)
    - the read signature algorithm
    - the saved signature data
    - the deterministic serialization of the remaining CBOR data item
 
Although the outlined scheme only supports signing data in the CBOR
notation, the ability representing data like
[bit-map images as CBOR byte strings](#elimination-of-multipart-mime-extensions),
there are from a practical point of view, virtually no constraints.

Note that other signature meta data such as public keys,
and key identifiers can also be included in a signature container
of the kind shown above.  Using the described scheme,
they would *automatically be signed* as well.
 
## Elimination of Multipart Mime Extensions
Consider the following rather awkward 
[multipart mime](https://www.rfc-editor.org/rfc/rfc2046) construct:

```
Content-Type: Multipart/Related; boundary=example-1
              start="<text@example.com>";
              type="text/plain"

--example-1
Content-Type: text/plain
Content-ID: <text@example.com>

This is text
--example-1
Content-Type: image/png
Content-ID: <image@example.com>

(binary)
--example-1--
```
Using CBOR the construct above could be replaced by the following code:

```
{
  "text": "This is text",
  "image": {
    "data": h'89504e470d0a1a0a...',
    "type": "image/png"
  }
}
```
Using CBOR adds flexibility since the attribute set for individual
elements can be customized as required by the application.

Additionally, boundary items like `--example-1--` and the
related measures for *avoiding clashes* with the actual data,
are eliminated.

## CBOR Mime Type
A side effect of the "CBOR-only" approach described in the previous section
is that it limits the need for application specific mime types when CBOR data
is transferred over HTTP; `application/cbor` may suffice.

## Signed HTTP Requests
There are several different solutions out in the wild as well as a recent
[IETF draft](https://datatracker.ietf.org/doc/draft-ietf-httpbis-message-signatures/),
for signing HTTP requests.

They typically share a common drawback: the signed request data
consists of separate elements based on different technologies,
making signed requests fairly difficult to serialize.
That is, storing such data in databases, or embedding it in other
objects requires specific measures.

However, by using a "CBOR only" approach, serialization becomes
straightforward as shown by the example below:

```
/ objectId /
1010(["https://xyzpay.standards/#request-1", {
  / httpParameters /
  1: {
    / method /
    1: "POST",
    / targetUrl /
    2: "https://payments.mybank.fr/req",
    / otherHeaders /
    3: {
      "example-header": "value, with, lots, of, commas"
    }
  },
  / destinationAccount /
  2: "DE75512108001245126199",
  / paymentRequest /
  3: {
    / payeeName	/
    1: "Space Shop",
    / requestId /
    2: "7040566321",
    / amount /
    4: "435.00",
    / currency /
    3: "EUR"
  },
  / userAuthorization /
  4: h'a5010302a401381e036d7832353531393a323032323a3107a3010120042158',
  / timeStamp /
  5: "2022-12-14T10:43:56Z",
  / requestSignature (enveloped) /
  -1: {
    / signatureAlgorithm = ES256 (COSE) /
    1: -7,
    / publicKey (COSE) /
    4: {
      / kty = EC /
      1: 2,
      / crv = P-256 /
      -1: 1,
      / x /
      -2: h'e812b1a6dcbc708f9ec43cc2921fa0a14e9d5eadcc6dc63471dd4b680c6236b5',
      / y /
      -3: h'9826dcbd4ce6e388f72edd9be413f2425a10f75b5fd83d95fa0cde53159a51d8'
    },
    / signatureValue /
    6: h'62911fea0d4325249d85e44a644d0efb765579e4a961d7f43a6befe06f51ec295b998c96f8595b173c3ff68638a4ab0a7ec95fea6ced10d5bd01db6c28b7fd7c'
  }
}])
```
Notes:

- The binary-encoded counterpart to the CBOR data above would be provided
in a HTTP Body element using `content‑type: application/cbor`.
- The example features the core HTTP header elements, plus another example
header needing a more sophisticated handling including canonicalization as
described in the aforementioned IETF draft.
- Top level keys **2**-**5** are specific for the (payment oriented) example.
- Top level key **-1** holds a signature container based on
[COSE](https://www.rfc-editor.org/rfc/rfc9052.html)
algorithms and key descriptors.
The signature scheme itself is described in the section
[Cryptographic Operations](#cryptographic-operations).
In the example the signature encompasses the embedding
[objectId](#url-based-object-identifiers) as well.

The net effect is that by using CBOR, the implications of a specific
transport method may only to a limited degree, affect the packaging
of data and signatures.

<br><br>
Version 0.14, 2023-01-28
