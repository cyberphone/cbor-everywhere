# CBOR Everywhere

*This repository contains information and links to information resources which describe
how application builders can take advantage of the unique
qualities of [CBOR](https://www.rfc-editor.org/rfc/rfc8949.html).*

## CBOR Roots and Motivations
T.B.D.

## Support for Binary Data
One of the more useful features of CBOR is the ability including binary data
"as is".  XML and JSON need to encode such data encoded
as [Base64](https://www.rfc-editor.org/rfc/rfc4648), leading to
a 33% size increase as well as requiring more processing.

A "bonus" of the CBOR binary support, is that awkward
multipart mime constructs like the following can be eliminated:
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
Using CBOR you could replace the above with the following,
here shown in *diagnostic* notation:
```
{
  "text": "This is text",
  "image": {
    "type": "image/png",
    "data": h'binary data in hex'
  }
}
```
Using CBOR is much more flexible because each element attribute set
can be customized as required by the application.

In addition, CBOR removes the need creating data
boundary items like `--example-1--` that does not
interfere with the actual data.

## URL Based Object Identifiers
JSON, XML, and particularly XML Schema (XSD) based designs, typically
use URLs as object identifiers.
To ease the conversion from JSON and XML, a compatible CBOR Object Extension
([COTX](https://www.ietf.org/archive/id/draft-rundgren-cotx-03.html)) construct been introduced.

