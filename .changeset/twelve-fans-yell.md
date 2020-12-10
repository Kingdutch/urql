---
'@urql/preact': patch
'urql': patch
---

Urql's useQuery for React and Preact now encodes it's cache results in a manner compatible with ReScript >= 8 as well as ReScript < 8 to ensure that Urql doesn't break when Wonka has been compiled with newer ReScript versions.
