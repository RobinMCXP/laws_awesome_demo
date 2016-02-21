# simple-imagemagick

Very simple [Imagemagick](http://www.imagemagick.org/) module for [Node](http://nodejs.org/).

Forked from [node-imagemagick](https://github.com/rsms/node-imagemagick): added **montage** and **composite** + removed functions that do no directly access the commandline interfaces.

You can install this module using [npm](http://github.com/isaacs/npm):

    npm install simple-imagemagick

Requires imagemagick CLI tools to be installed. There are numerous ways to install them. For instance, if you're on OS X you can use [Homebrew](http://mxcl.github.com/homebrew/): `brew install imagemagick`.

## Examples

### Use module

```
var im = require('simple-imagemagick');
```

### identify(args, callback(err, output))

Custom identification where `args` is an array of arguments. The result is returned as a raw string to `output`.

```javascript
im.identify([
  'IMG_6572.JPG'
], function (err, data){
  if (err) return console.log(err);
  return console.log(data);
});

// -> IMG_6572.JPG JPEG 640x480 640x480+0+0 8-bit sRGB 134KB 0.000u 0:00.000
```

### convert(args, callback(err, stdout, stderr))

Raw interface to `convert` passing arguments in the array `args`.

Example:

```javascript
im.convert([
  'kittens.jpg',
  '-resize'    , '25x120',
  'kittens-small.jpg'
], function(err, stdout){
  if (err) console.log(err);
  console.log(stdout);
});
```

### montage(args, callback(err, stdout, stderr))

Raw interface to `montage` passing arguments in the array `args`.

Example:

```javascript
im.montage([
  'image1.jpg',
  'image2.jpg',
  'image3.jpg',
  '-tile'      ,  '3x3',
  '-geometry'  ,  '+0+0',
  'outputimage.jpg'
], function(err, stdout){
  if (err) console.log(err);
  console.log(stdout);
});
```

### composite(args, callback(err, stdout, stderr))

Raw interface to `montage` passing arguments in the array `args`.

Example:

```javascript
im.composite([
  '-compose'   , 'Multiply',
  '-gravity'   , 'center',
  'image1.jpg' ,
  'image2.jpg' ,
  'outputimage.jpg'
], function(err, stdout){
  if (err) console.log(err);
  console.log(stdout);
});
```

### convert.path

Path to the `convert` program. Defaults to `"convert"`.

### identify.path

Path to the `identify` program. Defaults to `"identify"`.

### montage.path

Path to the `montage` program. Defaults to `"montage"`.

### composite.path

Path to the `composite` program. Defaults to `"composite"`.

## License (MIT)

Copyright (c) 2010-2012 Rasmus Andersson <http://hunch.se/>

Simplyfied by Sam Decrock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
