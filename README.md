# JIT Assembler

[![Build Status](https://secure.travis-ci.org/js-js/jit.js.png)](http://travis-ci.org/js-js/jit.js)
[![NPM version](https://badge.fury.io/js/jit.js.svg)](http://badge.fury.io/js/jit.js)

![Logo](https://raw.github.com/indutny/jit.js/master/logo/jit-small.png)

## Instructions

```javascript
var jit = require('jit.js');

var fn = jit.compile(function() {
  this.Proc(function() {
    this.mov('rax', 42);
    this.Return();
  });
});

console.log(fn());  // 42
```

More information is available on the [wiki pages][0]

#### LICENSE

This software is licensed under the MIT License.

Copyright Fedor Indutny, 2015.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
USE OR OTHER DEALINGS IN THE SOFTWARE.

[0]: https://github.com/js-js/jit.js/wiki
