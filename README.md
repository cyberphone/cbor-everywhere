# CBOR Everywhere

*This document contains information and links to information resources which describe
how application builders can take advantage of the unique
qualities of [CBOR](https://www.rfc-editor.org/rfc/rfc8949.html).
The target audience for this document are developers who currently
use [JSON](https://www.rfc-editor.org/rfc/rfc8259) or
[XML](https://www.w3.org/XML/).*

## CBOR Roots and Motivations
T.B.D.

## Notation
For readability reasons, the examples in this document are displayed in a
textual format known as 
[diagnostic notation](https://www.rfc-editor.org/rfc/rfc8949#name-diagnostic-notation),
rather than the actual CBOR binary code.

## Support for Binary Data
One of the more useful features of CBOR is the ability representing binary data
"as is".  Using XML or JSON, binary data must be encoded
as [Base64](https://www.rfc-editor.org/rfc/rfc4648), leading to
a 33% size increase as well as requiring additional processing.

## URL Based Object Identifiers
JSON, XML, and particularly XML Schema (XSD) based designs, typically
use URLs as object identifiers.
To ease the conversion from JSON and XML, a compatible
**C**BOR&nbsp;**O**bject&nbsp;e**X**tension
([COTX](https://www.ietf.org/archive/id/draft-rundgren-cotx-03.html))
construct has been defined.  Sample:

```
1010(["https://example.com/myobject", {
  1: "data",
  2: "more data"
}])
```
`1010` is a special purpose (dedicated) CBOR tag.

## Deterministic Serialization
Unlike XML and JSON, CBOR supports deterministic serialization, 
eliminating potentially troublesome canonicalization steps.

Deterministic serialization can be used to represent signed
data in a more efficient way than 
[JWS](https://www.rfc-editor.org/rfc/rfc7515.html) and 
[XML Dsig](https://www.w3.org/TR/xmldsig-core1/),
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
  3: {
    1: 5,
    2: h'fe49acf5b92b6e923594f2e83368f680ac924be93cf533aecaf802e37757f8c9'
  }
}
```
Element `3` holds a signature container map with
a signature algorithm identifier (`5`) and signature data (`h'fe49...`).
The signature would be created by the following steps:
- Add an empty signature container map to the unsigned data
- Add signature algorithm and associated key (`1`) to the signature container map
- Run the signature algorithm over the deterministic serialization of the 
current CBOR data item
- Add the resulting signature data and associated key (`2`) to the signature container map

Verification is performed by the following steps:
- Read the signature algorithm from the signature container map
- Read the signature data from the signature container map
- Remove the signature data and associated key (`2`) from the signature container map
- Run signature verification using the remaining
 CBOR data item deterministically serialized, the read signature algorithm,
 and the saved signature data as input arguments
 
Although the outlined scheme only supports signing data in the CBOR
notation, the ability representing data like bit map images as CBOR
byte strings, there are from a practical point of view,
virtually no constraints.

Note that other signature header data such as public keys,
and key identifiers can be included in a signature container of
the kind shown above.  Using the described scheme,
they would be signed as well.
 
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
    "type": "image/png",
    "data": h'89504e470d0a1a0a...'
  }
}
```
Using CBOR adds flexibility since each element attribute set
can be customized as required by the application.

Additionally, boundary items like `--example-1--` and the
related measures for *avoiding clashes* with the actual data,
are eliminated.

