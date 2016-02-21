var childproc = require('child_process'),
    EventEmitter = require('events').EventEmitter;


function exec2(file, args /*, options, callback */) {
  var options = { encoding: 'utf8'
                , timeout: 0
                , maxBuffer: 500*1024
                , killSignal: 'SIGKILL'
                , output: null
                };

  var callback = arguments[arguments.length-1];
  if ('function' != typeof callback) callback = null;

  if (typeof arguments[2] == 'object') {
    var keys = Object.keys(options);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (arguments[2][k] !== undefined) options[k] = arguments[2][k];
    }
  }

  var child = childproc.spawn(file, args);
  var killed = false;
  var timedOut = false;

  var Wrapper = function(proc) {
    this.proc = proc;
    this.stderr = new Accumulator();
    proc.emitter = new EventEmitter();
    proc.on = proc.emitter.on.bind(proc.emitter);
    this.out = proc.emitter.emit.bind(proc.emitter, 'data');
    this.err = this.stderr.out.bind(this.stderr);
    this.errCurrent = this.stderr.current.bind(this.stderr);
  };
  Wrapper.prototype.finish = function(err) {
    this.proc.emitter.emit('end', err, this.errCurrent());
  };

  var Accumulator = function(cb) {
    this.stdout = {contents: ""};
    this.stderr = {contents: ""};
    this.callback = cb;

    var limitedWrite = function(stream) {
      return function(chunk) {
        stream.contents += chunk;
        if (!killed && stream.contents.length > options.maxBuffer) {
          child.kill(options.killSignal);
          killed = true;
        }
      };
    };
    this.out = limitedWrite(this.stdout);
    this.err = limitedWrite(this.stderr);
  };
  Accumulator.prototype.current = function() { return this.stdout.contents; };
  Accumulator.prototype.errCurrent = function() { return this.stderr.contents; };
  Accumulator.prototype.finish = function(err) { this.callback(err, this.stdout.contents, this.stderr.contents); };

  var std = callback ? new Accumulator(callback) : new Wrapper(child);

  var timeoutId;
  if (options.timeout > 0) {
    timeoutId = setTimeout(function () {
      if (!killed) {
        child.kill(options.killSignal);
        timedOut = true;
        killed = true;
        timeoutId = null;
      }
    }, options.timeout);
  }

  child.stdout.setEncoding(options.encoding);
  child.stderr.setEncoding(options.encoding);

  child.stdout.addListener("data", function (chunk) { std.out(chunk, options.encoding); });
  child.stderr.addListener("data", function (chunk) { std.err(chunk, options.encoding); });

  var version = process.versions.node.split('.');
  child.addListener(version[0] == 0 && version[1] < 7 ? "exit" : "close", function (code, signal) {
    if (timeoutId) clearTimeout(timeoutId);
    if (code === 0 && signal === null) {
      std.finish(null);
    } else {
      var e = new Error("Command "+(timedOut ? "timed out" : "failed")+": " + std.errCurrent());
      e.timedOut = timedOut;
      e.killed = killed;
      e.code = code;
      e.signal = signal;
      std.finish(e);
    }
  });

  return child;
};


function parseIdentify(input) {
  var lines = input.split("\n"),
      prop = {},
      props = [prop],
      prevIndent = 0,
      indents = [indent],
      currentLine, comps, indent, i;

  lines.shift(); //drop first line (Image: name.jpg)

  for (i in lines) {
    currentLine = lines[i];
    indent = currentLine.search(/\S/);
    if (indent >= 0) {
      comps = currentLine.split(': ');
      if (indent > prevIndent) indents.push(indent);
      while (indent < prevIndent && props.length) {
        indents.pop();
        prop = props.pop();
        prevIndent = indents[indents.length - 1];
      }
      if (comps.length < 2) {
        props.push(prop);
        prop = prop[currentLine.split(':')[0].trim().toLowerCase()] = {};
      } else {
        prop[comps[0].trim().toLowerCase()] = comps[1].trim()
      }
      prevIndent = indent;
    }
  }
  return prop;
};

exports.identify = function(pathOrArgs, callback) {
  var isCustom = Array.isArray(pathOrArgs),
      isData,
      args = isCustom ? ([]).concat(pathOrArgs) : ['-verbose', pathOrArgs];

  if (typeof args[args.length-1] === 'object') {
    isData = true;
    pathOrArgs = args[args.length-1];
    args[args.length-1] = '-';
    if (!pathOrArgs.data)
      throw new Error('first argument is missing the "data" member');
  } else if (typeof pathOrArgs === 'function') {
    args[args.length-1] = '-';
    callback = pathOrArgs;
  }
  var proc = exec2(exports.identify.path, args, {timeout:120000}, function(err, stdout, stderr) {
    var result, geometry;
    if (!err) {
      if (isCustom) {
        result = stdout;
      } else {
        result = parseIdentify(stdout);
        geometry = result['geometry'].split(/x/);

        result.format = result.format.match(/\S*/)[0]
        result.width = parseInt(geometry[0]);
        result.height = parseInt(geometry[1]);
        result.depth = parseInt(result.depth);
        if (result.quality !== undefined) result.quality = parseInt(result.quality) / 100;
      }
    }
    callback(err, result);
  });
  if (isData) {
    if ('string' === typeof pathOrArgs.data) {
      proc.stdin.setEncoding('binary');
      proc.stdin.write(pathOrArgs.data, 'binary');
      proc.stdin.end();
    } else {
      proc.stdin.end(pathOrArgs.data);
    }
  }
  return proc;
}
exports.identify.path = 'identify';


exports.convert = function(args, timeout, callback) {
  var procopt = {encoding: 'binary'};
  if (typeof timeout === 'function') {
    callback = timeout;
    timeout = 0;
  } else if (typeof timeout !== 'number') {
    timeout = 0;
  }
  if (timeout && (timeout = parseInt(timeout)) > 0 && !isNaN(timeout))
    procopt.timeout = timeout;
  return exec2(exports.convert.path, args, procopt, callback);
}
exports.convert.path = 'convert';


exports.montage = function(args, timeout, callback) {
  var procopt = {encoding: 'binary'};
  if (typeof timeout === 'function') {
    callback = timeout;
    timeout = 0;
  } else if (typeof timeout !== 'number') {
    timeout = 0;
  }
  if (timeout && (timeout = parseInt(timeout)) > 0 && !isNaN(timeout))
    procopt.timeout = timeout;
  return exec2(exports.montage.path, args, procopt, callback);
}
exports.montage.path = 'montage';


exports.composite = function(args, timeout, callback) {
  var procopt = {encoding: 'binary'};
  if (typeof timeout === 'function') {
    callback = timeout;
    timeout = 0;
  } else if (typeof timeout !== 'number') {
    timeout = 0;
  }
  if (timeout && (timeout = parseInt(timeout)) > 0 && !isNaN(timeout))
    procopt.timeout = timeout;
  return exec2(exports.composite.path, args, procopt, callback);
}
exports.composite.path = 'composite';

