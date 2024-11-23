/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/

// NAMESPACE OBJECT: ./node_modules/socket.io-parser/build/esm/index.js
var socket_io_parser_build_esm_namespaceObject = {};
__webpack_require__.r(socket_io_parser_build_esm_namespaceObject);
__webpack_require__.d(socket_io_parser_build_esm_namespaceObject, {
  Decoder: () => (Decoder),
  Encoder: () => (Encoder),
  PacketType: () => (PacketType),
  protocol: () => (build_esm_protocol)
});

;// ./node_modules/engine.io-parser/build/esm/commons.js
const PACKET_TYPES = Object.create(null); // no Map = no polyfill
PACKET_TYPES["open"] = "0";
PACKET_TYPES["close"] = "1";
PACKET_TYPES["ping"] = "2";
PACKET_TYPES["pong"] = "3";
PACKET_TYPES["message"] = "4";
PACKET_TYPES["upgrade"] = "5";
PACKET_TYPES["noop"] = "6";
const PACKET_TYPES_REVERSE = Object.create(null);
Object.keys(PACKET_TYPES).forEach((key) => {
    PACKET_TYPES_REVERSE[PACKET_TYPES[key]] = key;
});
const ERROR_PACKET = { type: "error", data: "parser error" };


;// ./node_modules/engine.io-parser/build/esm/encodePacket.browser.js

const withNativeBlob = typeof Blob === "function" ||
    (typeof Blob !== "undefined" &&
        Object.prototype.toString.call(Blob) === "[object BlobConstructor]");
const withNativeArrayBuffer = typeof ArrayBuffer === "function";
// ArrayBuffer.isView method is not defined in IE10
const isView = (obj) => {
    return typeof ArrayBuffer.isView === "function"
        ? ArrayBuffer.isView(obj)
        : obj && obj.buffer instanceof ArrayBuffer;
};
const encodePacket = ({ type, data }, supportsBinary, callback) => {
    if (withNativeBlob && data instanceof Blob) {
        if (supportsBinary) {
            return callback(data);
        }
        else {
            return encodeBlobAsBase64(data, callback);
        }
    }
    else if (withNativeArrayBuffer &&
        (data instanceof ArrayBuffer || isView(data))) {
        if (supportsBinary) {
            return callback(data);
        }
        else {
            return encodeBlobAsBase64(new Blob([data]), callback);
        }
    }
    // plain string
    return callback(PACKET_TYPES[type] + (data || ""));
};
const encodeBlobAsBase64 = (data, callback) => {
    const fileReader = new FileReader();
    fileReader.onload = function () {
        const content = fileReader.result.split(",")[1];
        callback("b" + (content || ""));
    };
    return fileReader.readAsDataURL(data);
};
function toArray(data) {
    if (data instanceof Uint8Array) {
        return data;
    }
    else if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    }
    else {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
}
let TEXT_ENCODER;
function encodePacketToBinary(packet, callback) {
    if (withNativeBlob && packet.data instanceof Blob) {
        return packet.data.arrayBuffer().then(toArray).then(callback);
    }
    else if (withNativeArrayBuffer &&
        (packet.data instanceof ArrayBuffer || isView(packet.data))) {
        return callback(toArray(packet.data));
    }
    encodePacket(packet, false, (encoded) => {
        if (!TEXT_ENCODER) {
            TEXT_ENCODER = new TextEncoder();
        }
        callback(TEXT_ENCODER.encode(encoded));
    });
}


;// ./node_modules/engine.io-parser/build/esm/contrib/base64-arraybuffer.js
// imported from https://github.com/socketio/base64-arraybuffer
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
// Use a lookup table to find the index.
const lookup = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
}
const encode = (arraybuffer) => {
    let bytes = new Uint8Array(arraybuffer), i, len = bytes.length, base64 = '';
    for (i = 0; i < len; i += 3) {
        base64 += chars[bytes[i] >> 2];
        base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64 += chars[bytes[i + 2] & 63];
    }
    if (len % 3 === 2) {
        base64 = base64.substring(0, base64.length - 1) + '=';
    }
    else if (len % 3 === 1) {
        base64 = base64.substring(0, base64.length - 2) + '==';
    }
    return base64;
};
const decode = (base64) => {
    let bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
    if (base64[base64.length - 1] === '=') {
        bufferLength--;
        if (base64[base64.length - 2] === '=') {
            bufferLength--;
        }
    }
    const arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
    for (i = 0; i < len; i += 4) {
        encoded1 = lookup[base64.charCodeAt(i)];
        encoded2 = lookup[base64.charCodeAt(i + 1)];
        encoded3 = lookup[base64.charCodeAt(i + 2)];
        encoded4 = lookup[base64.charCodeAt(i + 3)];
        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
    return arraybuffer;
};

;// ./node_modules/engine.io-parser/build/esm/decodePacket.browser.js


const decodePacket_browser_withNativeArrayBuffer = typeof ArrayBuffer === "function";
const decodePacket = (encodedPacket, binaryType) => {
    if (typeof encodedPacket !== "string") {
        return {
            type: "message",
            data: mapBinary(encodedPacket, binaryType),
        };
    }
    const type = encodedPacket.charAt(0);
    if (type === "b") {
        return {
            type: "message",
            data: decodeBase64Packet(encodedPacket.substring(1), binaryType),
        };
    }
    const packetType = PACKET_TYPES_REVERSE[type];
    if (!packetType) {
        return ERROR_PACKET;
    }
    return encodedPacket.length > 1
        ? {
            type: PACKET_TYPES_REVERSE[type],
            data: encodedPacket.substring(1),
        }
        : {
            type: PACKET_TYPES_REVERSE[type],
        };
};
const decodeBase64Packet = (data, binaryType) => {
    if (decodePacket_browser_withNativeArrayBuffer) {
        const decoded = decode(data);
        return mapBinary(decoded, binaryType);
    }
    else {
        return { base64: true, data }; // fallback for old browsers
    }
};
const mapBinary = (data, binaryType) => {
    switch (binaryType) {
        case "blob":
            if (data instanceof Blob) {
                // from WebSocket + binaryType "blob"
                return data;
            }
            else {
                // from HTTP long-polling or WebTransport
                return new Blob([data]);
            }
        case "arraybuffer":
        default:
            if (data instanceof ArrayBuffer) {
                // from HTTP long-polling (base64) or WebSocket + binaryType "arraybuffer"
                return data;
            }
            else {
                // from WebTransport (Uint8Array)
                return data.buffer;
            }
    }
};

;// ./node_modules/engine.io-parser/build/esm/index.js



const SEPARATOR = String.fromCharCode(30); // see https://en.wikipedia.org/wiki/Delimiter#ASCII_delimited_text
const encodePayload = (packets, callback) => {
    // some packets may be added to the array while encoding, so the initial length must be saved
    const length = packets.length;
    const encodedPackets = new Array(length);
    let count = 0;
    packets.forEach((packet, i) => {
        // force base64 encoding for binary packets
        encodePacket(packet, false, (encodedPacket) => {
            encodedPackets[i] = encodedPacket;
            if (++count === length) {
                callback(encodedPackets.join(SEPARATOR));
            }
        });
    });
};
const decodePayload = (encodedPayload, binaryType) => {
    const encodedPackets = encodedPayload.split(SEPARATOR);
    const packets = [];
    for (let i = 0; i < encodedPackets.length; i++) {
        const decodedPacket = decodePacket(encodedPackets[i], binaryType);
        packets.push(decodedPacket);
        if (decodedPacket.type === "error") {
            break;
        }
    }
    return packets;
};
function createPacketEncoderStream() {
    return new TransformStream({
        transform(packet, controller) {
            encodePacketToBinary(packet, (encodedPacket) => {
                const payloadLength = encodedPacket.length;
                let header;
                // inspired by the WebSocket format: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#decoding_payload_length
                if (payloadLength < 126) {
                    header = new Uint8Array(1);
                    new DataView(header.buffer).setUint8(0, payloadLength);
                }
                else if (payloadLength < 65536) {
                    header = new Uint8Array(3);
                    const view = new DataView(header.buffer);
                    view.setUint8(0, 126);
                    view.setUint16(1, payloadLength);
                }
                else {
                    header = new Uint8Array(9);
                    const view = new DataView(header.buffer);
                    view.setUint8(0, 127);
                    view.setBigUint64(1, BigInt(payloadLength));
                }
                // first bit indicates whether the payload is plain text (0) or binary (1)
                if (packet.data && typeof packet.data !== "string") {
                    header[0] |= 0x80;
                }
                controller.enqueue(header);
                controller.enqueue(encodedPacket);
            });
        },
    });
}
let TEXT_DECODER;
function totalLength(chunks) {
    return chunks.reduce((acc, chunk) => acc + chunk.length, 0);
}
function concatChunks(chunks, size) {
    if (chunks[0].length === size) {
        return chunks.shift();
    }
    const buffer = new Uint8Array(size);
    let j = 0;
    for (let i = 0; i < size; i++) {
        buffer[i] = chunks[0][j++];
        if (j === chunks[0].length) {
            chunks.shift();
            j = 0;
        }
    }
    if (chunks.length && j < chunks[0].length) {
        chunks[0] = chunks[0].slice(j);
    }
    return buffer;
}
function createPacketDecoderStream(maxPayload, binaryType) {
    if (!TEXT_DECODER) {
        TEXT_DECODER = new TextDecoder();
    }
    const chunks = [];
    let state = 0 /* State.READ_HEADER */;
    let expectedLength = -1;
    let isBinary = false;
    return new TransformStream({
        transform(chunk, controller) {
            chunks.push(chunk);
            while (true) {
                if (state === 0 /* State.READ_HEADER */) {
                    if (totalLength(chunks) < 1) {
                        break;
                    }
                    const header = concatChunks(chunks, 1);
                    isBinary = (header[0] & 0x80) === 0x80;
                    expectedLength = header[0] & 0x7f;
                    if (expectedLength < 126) {
                        state = 3 /* State.READ_PAYLOAD */;
                    }
                    else if (expectedLength === 126) {
                        state = 1 /* State.READ_EXTENDED_LENGTH_16 */;
                    }
                    else {
                        state = 2 /* State.READ_EXTENDED_LENGTH_64 */;
                    }
                }
                else if (state === 1 /* State.READ_EXTENDED_LENGTH_16 */) {
                    if (totalLength(chunks) < 2) {
                        break;
                    }
                    const headerArray = concatChunks(chunks, 2);
                    expectedLength = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length).getUint16(0);
                    state = 3 /* State.READ_PAYLOAD */;
                }
                else if (state === 2 /* State.READ_EXTENDED_LENGTH_64 */) {
                    if (totalLength(chunks) < 8) {
                        break;
                    }
                    const headerArray = concatChunks(chunks, 8);
                    const view = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length);
                    const n = view.getUint32(0);
                    if (n > Math.pow(2, 53 - 32) - 1) {
                        // the maximum safe integer in JavaScript is 2^53 - 1
                        controller.enqueue(ERROR_PACKET);
                        break;
                    }
                    expectedLength = n * Math.pow(2, 32) + view.getUint32(4);
                    state = 3 /* State.READ_PAYLOAD */;
                }
                else {
                    if (totalLength(chunks) < expectedLength) {
                        break;
                    }
                    const data = concatChunks(chunks, expectedLength);
                    controller.enqueue(decodePacket(isBinary ? data : TEXT_DECODER.decode(data), binaryType));
                    state = 0 /* State.READ_HEADER */;
                }
                if (expectedLength === 0 || expectedLength > maxPayload) {
                    controller.enqueue(ERROR_PACKET);
                    break;
                }
            }
        },
    });
}
const protocol = 4;


;// ./node_modules/@socket.io/component-emitter/lib/esm/index.js
/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
}

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }

  // Remove event specific arrays for event types that no
  // one is subscribed for to avoid memory leak.
  if (callbacks.length === 0) {
    delete this._callbacks['$' + event];
  }

  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};

  var args = new Array(arguments.length - 1)
    , callbacks = this._callbacks['$' + event];

  for (var i = 1; i < arguments.length; i++) {
    args[i - 1] = arguments[i];
  }

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

// alias used for reserved events (protected method)
Emitter.prototype.emitReserved = Emitter.prototype.emit;

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

;// ./node_modules/engine.io-client/build/esm/globals.js
const nextTick = (() => {
    const isPromiseAvailable = typeof Promise === "function" && typeof Promise.resolve === "function";
    if (isPromiseAvailable) {
        return (cb) => Promise.resolve().then(cb);
    }
    else {
        return (cb, setTimeoutFn) => setTimeoutFn(cb, 0);
    }
})();
const globalThisShim = (() => {
    if (typeof self !== "undefined") {
        return self;
    }
    else if (typeof window !== "undefined") {
        return window;
    }
    else {
        return Function("return this")();
    }
})();
const defaultBinaryType = "arraybuffer";
function createCookieJar() { }

;// ./node_modules/engine.io-client/build/esm/util.js

function pick(obj, ...attr) {
    return attr.reduce((acc, k) => {
        if (obj.hasOwnProperty(k)) {
            acc[k] = obj[k];
        }
        return acc;
    }, {});
}
// Keep a reference to the real timeout functions so they can be used when overridden
const NATIVE_SET_TIMEOUT = globalThisShim.setTimeout;
const NATIVE_CLEAR_TIMEOUT = globalThisShim.clearTimeout;
function installTimerFunctions(obj, opts) {
    if (opts.useNativeTimers) {
        obj.setTimeoutFn = NATIVE_SET_TIMEOUT.bind(globalThisShim);
        obj.clearTimeoutFn = NATIVE_CLEAR_TIMEOUT.bind(globalThisShim);
    }
    else {
        obj.setTimeoutFn = globalThisShim.setTimeout.bind(globalThisShim);
        obj.clearTimeoutFn = globalThisShim.clearTimeout.bind(globalThisShim);
    }
}
// base64 encoded buffers are about 33% bigger (https://en.wikipedia.org/wiki/Base64)
const BASE64_OVERHEAD = 1.33;
// we could also have used `new Blob([obj]).size`, but it isn't supported in IE9
function byteLength(obj) {
    if (typeof obj === "string") {
        return utf8Length(obj);
    }
    // arraybuffer or blob
    return Math.ceil((obj.byteLength || obj.size) * BASE64_OVERHEAD);
}
function utf8Length(str) {
    let c = 0, length = 0;
    for (let i = 0, l = str.length; i < l; i++) {
        c = str.charCodeAt(i);
        if (c < 0x80) {
            length += 1;
        }
        else if (c < 0x800) {
            length += 2;
        }
        else if (c < 0xd800 || c >= 0xe000) {
            length += 3;
        }
        else {
            i++;
            length += 4;
        }
    }
    return length;
}
/**
 * Generates a random 8-characters string.
 */
function randomString() {
    return (Date.now().toString(36).substring(3) +
        Math.random().toString(36).substring(2, 5));
}

;// ./node_modules/engine.io-client/build/esm/contrib/parseqs.js
// imported from https://github.com/galkn/querystring
/**
 * Compiles a querystring
 * Returns string representation of the object
 *
 * @param {Object}
 * @api private
 */
function parseqs_encode(obj) {
    let str = '';
    for (let i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (str.length)
                str += '&';
            str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
        }
    }
    return str;
}
/**
 * Parses a simple querystring into an object
 *
 * @param {String} qs
 * @api private
 */
function parseqs_decode(qs) {
    let qry = {};
    let pairs = qs.split('&');
    for (let i = 0, l = pairs.length; i < l; i++) {
        let pair = pairs[i].split('=');
        qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return qry;
}

;// ./node_modules/engine.io-client/build/esm/transport.js




class TransportError extends Error {
    constructor(reason, description, context) {
        super(reason);
        this.description = description;
        this.context = context;
        this.type = "TransportError";
    }
}
class Transport extends Emitter {
    /**
     * Transport abstract constructor.
     *
     * @param {Object} opts - options
     * @protected
     */
    constructor(opts) {
        super();
        this.writable = false;
        installTimerFunctions(this, opts);
        this.opts = opts;
        this.query = opts.query;
        this.socket = opts.socket;
        this.supportsBinary = !opts.forceBase64;
    }
    /**
     * Emits an error.
     *
     * @param {String} reason
     * @param description
     * @param context - the error context
     * @return {Transport} for chaining
     * @protected
     */
    onError(reason, description, context) {
        super.emitReserved("error", new TransportError(reason, description, context));
        return this;
    }
    /**
     * Opens the transport.
     */
    open() {
        this.readyState = "opening";
        this.doOpen();
        return this;
    }
    /**
     * Closes the transport.
     */
    close() {
        if (this.readyState === "opening" || this.readyState === "open") {
            this.doClose();
            this.onClose();
        }
        return this;
    }
    /**
     * Sends multiple packets.
     *
     * @param {Array} packets
     */
    send(packets) {
        if (this.readyState === "open") {
            this.write(packets);
        }
        else {
            // this might happen if the transport was silently closed in the beforeunload event handler
        }
    }
    /**
     * Called upon open
     *
     * @protected
     */
    onOpen() {
        this.readyState = "open";
        this.writable = true;
        super.emitReserved("open");
    }
    /**
     * Called with data.
     *
     * @param {String} data
     * @protected
     */
    onData(data) {
        const packet = decodePacket(data, this.socket.binaryType);
        this.onPacket(packet);
    }
    /**
     * Called with a decoded packet.
     *
     * @protected
     */
    onPacket(packet) {
        super.emitReserved("packet", packet);
    }
    /**
     * Called upon close.
     *
     * @protected
     */
    onClose(details) {
        this.readyState = "closed";
        super.emitReserved("close", details);
    }
    /**
     * Pauses the transport, in order not to lose packets during an upgrade.
     *
     * @param onPause
     */
    pause(onPause) { }
    createUri(schema, query = {}) {
        return (schema +
            "://" +
            this._hostname() +
            this._port() +
            this.opts.path +
            this._query(query));
    }
    _hostname() {
        const hostname = this.opts.hostname;
        return hostname.indexOf(":") === -1 ? hostname : "[" + hostname + "]";
    }
    _port() {
        if (this.opts.port &&
            ((this.opts.secure && Number(this.opts.port !== 443)) ||
                (!this.opts.secure && Number(this.opts.port) !== 80))) {
            return ":" + this.opts.port;
        }
        else {
            return "";
        }
    }
    _query(query) {
        const encodedQuery = parseqs_encode(query);
        return encodedQuery.length ? "?" + encodedQuery : "";
    }
}

;// ./node_modules/engine.io-client/build/esm/transports/polling.js



class polling_Polling extends Transport {
    constructor() {
        super(...arguments);
        this._polling = false;
    }
    get name() {
        return "polling";
    }
    /**
     * Opens the socket (triggers polling). We write a PING message to determine
     * when the transport is open.
     *
     * @protected
     */
    doOpen() {
        this._poll();
    }
    /**
     * Pauses polling.
     *
     * @param {Function} onPause - callback upon buffers are flushed and transport is paused
     * @package
     */
    pause(onPause) {
        this.readyState = "pausing";
        const pause = () => {
            this.readyState = "paused";
            onPause();
        };
        if (this._polling || !this.writable) {
            let total = 0;
            if (this._polling) {
                total++;
                this.once("pollComplete", function () {
                    --total || pause();
                });
            }
            if (!this.writable) {
                total++;
                this.once("drain", function () {
                    --total || pause();
                });
            }
        }
        else {
            pause();
        }
    }
    /**
     * Starts polling cycle.
     *
     * @private
     */
    _poll() {
        this._polling = true;
        this.doPoll();
        this.emitReserved("poll");
    }
    /**
     * Overloads onData to detect payloads.
     *
     * @protected
     */
    onData(data) {
        const callback = (packet) => {
            // if its the first message we consider the transport open
            if ("opening" === this.readyState && packet.type === "open") {
                this.onOpen();
            }
            // if its a close packet, we close the ongoing requests
            if ("close" === packet.type) {
                this.onClose({ description: "transport closed by the server" });
                return false;
            }
            // otherwise bypass onData and handle the message
            this.onPacket(packet);
        };
        // decode payload
        decodePayload(data, this.socket.binaryType).forEach(callback);
        // if an event did not trigger closing
        if ("closed" !== this.readyState) {
            // if we got data we're not polling
            this._polling = false;
            this.emitReserved("pollComplete");
            if ("open" === this.readyState) {
                this._poll();
            }
            else {
            }
        }
    }
    /**
     * For polling, send a close packet.
     *
     * @protected
     */
    doClose() {
        const close = () => {
            this.write([{ type: "close" }]);
        };
        if ("open" === this.readyState) {
            close();
        }
        else {
            // in case we're trying to close while
            // handshaking is in progress (GH-164)
            this.once("open", close);
        }
    }
    /**
     * Writes a packets payload.
     *
     * @param {Array} packets - data packets
     * @protected
     */
    write(packets) {
        this.writable = false;
        encodePayload(packets, (data) => {
            this.doWrite(data, () => {
                this.writable = true;
                this.emitReserved("drain");
            });
        });
    }
    /**
     * Generates uri for connection.
     *
     * @private
     */
    uri() {
        const schema = this.opts.secure ? "https" : "http";
        const query = this.query || {};
        // cache busting is forced
        if (false !== this.opts.timestampRequests) {
            query[this.opts.timestampParam] = randomString();
        }
        if (!this.supportsBinary && !query.sid) {
            query.b64 = 1;
        }
        return this.createUri(schema, query);
    }
}

;// ./node_modules/engine.io-client/build/esm/contrib/has-cors.js
// imported from https://github.com/component/has-cors
let value = false;
try {
    value = typeof XMLHttpRequest !== 'undefined' &&
        'withCredentials' in new XMLHttpRequest();
}
catch (err) {
    // if XMLHttp support is disabled in IE then it will throw
    // when trying to create
}
const hasCORS = value;

;// ./node_modules/engine.io-client/build/esm/transports/polling-xhr.js





function empty() { }
class BaseXHR extends polling_Polling {
    /**
     * XHR Polling constructor.
     *
     * @param {Object} opts
     * @package
     */
    constructor(opts) {
        super(opts);
        if (typeof location !== "undefined") {
            const isSSL = "https:" === location.protocol;
            let port = location.port;
            // some user agents have empty `location.port`
            if (!port) {
                port = isSSL ? "443" : "80";
            }
            this.xd =
                (typeof location !== "undefined" &&
                    opts.hostname !== location.hostname) ||
                    port !== opts.port;
        }
    }
    /**
     * Sends data.
     *
     * @param {String} data to send.
     * @param {Function} called upon flush.
     * @private
     */
    doWrite(data, fn) {
        const req = this.request({
            method: "POST",
            data: data,
        });
        req.on("success", fn);
        req.on("error", (xhrStatus, context) => {
            this.onError("xhr post error", xhrStatus, context);
        });
    }
    /**
     * Starts a poll cycle.
     *
     * @private
     */
    doPoll() {
        const req = this.request();
        req.on("data", this.onData.bind(this));
        req.on("error", (xhrStatus, context) => {
            this.onError("xhr poll error", xhrStatus, context);
        });
        this.pollXhr = req;
    }
}
class Request extends Emitter {
    /**
     * Request constructor
     *
     * @param {Object} options
     * @package
     */
    constructor(createRequest, uri, opts) {
        super();
        this.createRequest = createRequest;
        installTimerFunctions(this, opts);
        this._opts = opts;
        this._method = opts.method || "GET";
        this._uri = uri;
        this._data = undefined !== opts.data ? opts.data : null;
        this._create();
    }
    /**
     * Creates the XHR object and sends the request.
     *
     * @private
     */
    _create() {
        var _a;
        const opts = pick(this._opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
        opts.xdomain = !!this._opts.xd;
        const xhr = (this._xhr = this.createRequest(opts));
        try {
            xhr.open(this._method, this._uri, true);
            try {
                if (this._opts.extraHeaders) {
                    // @ts-ignore
                    xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
                    for (let i in this._opts.extraHeaders) {
                        if (this._opts.extraHeaders.hasOwnProperty(i)) {
                            xhr.setRequestHeader(i, this._opts.extraHeaders[i]);
                        }
                    }
                }
            }
            catch (e) { }
            if ("POST" === this._method) {
                try {
                    xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
                }
                catch (e) { }
            }
            try {
                xhr.setRequestHeader("Accept", "*/*");
            }
            catch (e) { }
            (_a = this._opts.cookieJar) === null || _a === void 0 ? void 0 : _a.addCookies(xhr);
            // ie6 check
            if ("withCredentials" in xhr) {
                xhr.withCredentials = this._opts.withCredentials;
            }
            if (this._opts.requestTimeout) {
                xhr.timeout = this._opts.requestTimeout;
            }
            xhr.onreadystatechange = () => {
                var _a;
                if (xhr.readyState === 3) {
                    (_a = this._opts.cookieJar) === null || _a === void 0 ? void 0 : _a.parseCookies(
                    // @ts-ignore
                    xhr.getResponseHeader("set-cookie"));
                }
                if (4 !== xhr.readyState)
                    return;
                if (200 === xhr.status || 1223 === xhr.status) {
                    this._onLoad();
                }
                else {
                    // make sure the `error` event handler that's user-set
                    // does not throw in the same tick and gets caught here
                    this.setTimeoutFn(() => {
                        this._onError(typeof xhr.status === "number" ? xhr.status : 0);
                    }, 0);
                }
            };
            xhr.send(this._data);
        }
        catch (e) {
            // Need to defer since .create() is called directly from the constructor
            // and thus the 'error' event can only be only bound *after* this exception
            // occurs.  Therefore, also, we cannot throw here at all.
            this.setTimeoutFn(() => {
                this._onError(e);
            }, 0);
            return;
        }
        if (typeof document !== "undefined") {
            this._index = Request.requestsCount++;
            Request.requests[this._index] = this;
        }
    }
    /**
     * Called upon error.
     *
     * @private
     */
    _onError(err) {
        this.emitReserved("error", err, this._xhr);
        this._cleanup(true);
    }
    /**
     * Cleans up house.
     *
     * @private
     */
    _cleanup(fromError) {
        if ("undefined" === typeof this._xhr || null === this._xhr) {
            return;
        }
        this._xhr.onreadystatechange = empty;
        if (fromError) {
            try {
                this._xhr.abort();
            }
            catch (e) { }
        }
        if (typeof document !== "undefined") {
            delete Request.requests[this._index];
        }
        this._xhr = null;
    }
    /**
     * Called upon load.
     *
     * @private
     */
    _onLoad() {
        const data = this._xhr.responseText;
        if (data !== null) {
            this.emitReserved("data", data);
            this.emitReserved("success");
            this._cleanup();
        }
    }
    /**
     * Aborts the request.
     *
     * @package
     */
    abort() {
        this._cleanup();
    }
}
Request.requestsCount = 0;
Request.requests = {};
/**
 * Aborts pending requests when unloading the window. This is needed to prevent
 * memory leaks (e.g. when using IE) and to ensure that no spurious error is
 * emitted.
 */
if (typeof document !== "undefined") {
    // @ts-ignore
    if (typeof attachEvent === "function") {
        // @ts-ignore
        attachEvent("onunload", unloadHandler);
    }
    else if (typeof addEventListener === "function") {
        const terminationEvent = "onpagehide" in globalThisShim ? "pagehide" : "unload";
        addEventListener(terminationEvent, unloadHandler, false);
    }
}
function unloadHandler() {
    for (let i in Request.requests) {
        if (Request.requests.hasOwnProperty(i)) {
            Request.requests[i].abort();
        }
    }
}
const hasXHR2 = (function () {
    const xhr = newRequest({
        xdomain: false,
    });
    return xhr && xhr.responseType !== null;
})();
/**
 * HTTP long-polling based on the built-in `XMLHttpRequest` object.
 *
 * Usage: browser
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
 */
class XHR extends BaseXHR {
    constructor(opts) {
        super(opts);
        const forceBase64 = opts && opts.forceBase64;
        this.supportsBinary = hasXHR2 && !forceBase64;
    }
    request(opts = {}) {
        Object.assign(opts, { xd: this.xd }, this.opts);
        return new Request(newRequest, this.uri(), opts);
    }
}
function newRequest(opts) {
    const xdomain = opts.xdomain;
    // XMLHttpRequest can be disabled on IE
    try {
        if ("undefined" !== typeof XMLHttpRequest && (!xdomain || hasCORS)) {
            return new XMLHttpRequest();
        }
    }
    catch (e) { }
    if (!xdomain) {
        try {
            return new globalThisShim[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP");
        }
        catch (e) { }
    }
}

;// ./node_modules/engine.io-client/build/esm/transports/websocket.js




// detect ReactNative environment
const isReactNative = typeof navigator !== "undefined" &&
    typeof navigator.product === "string" &&
    navigator.product.toLowerCase() === "reactnative";
class BaseWS extends Transport {
    get name() {
        return "websocket";
    }
    doOpen() {
        const uri = this.uri();
        const protocols = this.opts.protocols;
        // React Native only supports the 'headers' option, and will print a warning if anything else is passed
        const opts = isReactNative
            ? {}
            : pick(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
        if (this.opts.extraHeaders) {
            opts.headers = this.opts.extraHeaders;
        }
        try {
            this.ws = this.createSocket(uri, protocols, opts);
        }
        catch (err) {
            return this.emitReserved("error", err);
        }
        this.ws.binaryType = this.socket.binaryType;
        this.addEventListeners();
    }
    /**
     * Adds event listeners to the socket
     *
     * @private
     */
    addEventListeners() {
        this.ws.onopen = () => {
            if (this.opts.autoUnref) {
                this.ws._socket.unref();
            }
            this.onOpen();
        };
        this.ws.onclose = (closeEvent) => this.onClose({
            description: "websocket connection closed",
            context: closeEvent,
        });
        this.ws.onmessage = (ev) => this.onData(ev.data);
        this.ws.onerror = (e) => this.onError("websocket error", e);
    }
    write(packets) {
        this.writable = false;
        // encodePacket efficient as it uses WS framing
        // no need for encodePayload
        for (let i = 0; i < packets.length; i++) {
            const packet = packets[i];
            const lastPacket = i === packets.length - 1;
            encodePacket(packet, this.supportsBinary, (data) => {
                // Sometimes the websocket has already been closed but the browser didn't
                // have a chance of informing us about it yet, in that case send will
                // throw an error
                try {
                    this.doWrite(packet, data);
                }
                catch (e) {
                }
                if (lastPacket) {
                    // fake drain
                    // defer to next tick to allow Socket to clear writeBuffer
                    nextTick(() => {
                        this.writable = true;
                        this.emitReserved("drain");
                    }, this.setTimeoutFn);
                }
            });
        }
    }
    doClose() {
        if (typeof this.ws !== "undefined") {
            this.ws.onerror = () => { };
            this.ws.close();
            this.ws = null;
        }
    }
    /**
     * Generates uri for connection.
     *
     * @private
     */
    uri() {
        const schema = this.opts.secure ? "wss" : "ws";
        const query = this.query || {};
        // append timestamp to URI
        if (this.opts.timestampRequests) {
            query[this.opts.timestampParam] = randomString();
        }
        // communicate binary support capabilities
        if (!this.supportsBinary) {
            query.b64 = 1;
        }
        return this.createUri(schema, query);
    }
}
const WebSocketCtor = globalThisShim.WebSocket || globalThisShim.MozWebSocket;
/**
 * WebSocket transport based on the built-in `WebSocket` object.
 *
 * Usage: browser, Node.js (since v21), Deno, Bun
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
 * @see https://caniuse.com/mdn-api_websocket
 * @see https://nodejs.org/api/globals.html#websocket
 */
class WS extends BaseWS {
    createSocket(uri, protocols, opts) {
        return !isReactNative
            ? protocols
                ? new WebSocketCtor(uri, protocols)
                : new WebSocketCtor(uri)
            : new WebSocketCtor(uri, protocols, opts);
    }
    doWrite(_packet, data) {
        this.ws.send(data);
    }
}

;// ./node_modules/engine.io-client/build/esm/transports/webtransport.js



/**
 * WebTransport transport based on the built-in `WebTransport` object.
 *
 * Usage: browser, Node.js (with the `@fails-components/webtransport` package)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebTransport
 * @see https://caniuse.com/webtransport
 */
class WT extends Transport {
    get name() {
        return "webtransport";
    }
    doOpen() {
        try {
            // @ts-ignore
            this._transport = new WebTransport(this.createUri("https"), this.opts.transportOptions[this.name]);
        }
        catch (err) {
            return this.emitReserved("error", err);
        }
        this._transport.closed
            .then(() => {
            this.onClose();
        })
            .catch((err) => {
            this.onError("webtransport error", err);
        });
        // note: we could have used async/await, but that would require some additional polyfills
        this._transport.ready.then(() => {
            this._transport.createBidirectionalStream().then((stream) => {
                const decoderStream = createPacketDecoderStream(Number.MAX_SAFE_INTEGER, this.socket.binaryType);
                const reader = stream.readable.pipeThrough(decoderStream).getReader();
                const encoderStream = createPacketEncoderStream();
                encoderStream.readable.pipeTo(stream.writable);
                this._writer = encoderStream.writable.getWriter();
                const read = () => {
                    reader
                        .read()
                        .then(({ done, value }) => {
                        if (done) {
                            return;
                        }
                        this.onPacket(value);
                        read();
                    })
                        .catch((err) => {
                    });
                };
                read();
                const packet = { type: "open" };
                if (this.query.sid) {
                    packet.data = `{"sid":"${this.query.sid}"}`;
                }
                this._writer.write(packet).then(() => this.onOpen());
            });
        });
    }
    write(packets) {
        this.writable = false;
        for (let i = 0; i < packets.length; i++) {
            const packet = packets[i];
            const lastPacket = i === packets.length - 1;
            this._writer.write(packet).then(() => {
                if (lastPacket) {
                    nextTick(() => {
                        this.writable = true;
                        this.emitReserved("drain");
                    }, this.setTimeoutFn);
                }
            });
        }
    }
    doClose() {
        var _a;
        (_a = this._transport) === null || _a === void 0 ? void 0 : _a.close();
    }
}

;// ./node_modules/engine.io-client/build/esm/transports/index.js



const transports = {
    websocket: WS,
    webtransport: WT,
    polling: XHR,
};

;// ./node_modules/engine.io-client/build/esm/contrib/parseuri.js
// imported from https://github.com/galkn/parseuri
/**
 * Parses a URI
 *
 * Note: we could also have used the built-in URL object, but it isn't supported on all platforms.
 *
 * See:
 * - https://developer.mozilla.org/en-US/docs/Web/API/URL
 * - https://caniuse.com/url
 * - https://www.rfc-editor.org/rfc/rfc3986#appendix-B
 *
 * History of the parse() method:
 * - first commit: https://github.com/socketio/socket.io-client/commit/4ee1d5d94b3906a9c052b459f1a818b15f38f91c
 * - export into its own module: https://github.com/socketio/engine.io-client/commit/de2c561e4564efeb78f1bdb1ba39ef81b2822cb3
 * - reimport: https://github.com/socketio/engine.io-client/commit/df32277c3f6d622eec5ed09f493cae3f3391d242
 *
 * @author Steven Levithan <stevenlevithan.com> (MIT license)
 * @api private
 */
const re = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
const parts = [
    'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
];
function parse(str) {
    if (str.length > 8000) {
        throw "URI too long";
    }
    const src = str, b = str.indexOf('['), e = str.indexOf(']');
    if (b != -1 && e != -1) {
        str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ';') + str.substring(e, str.length);
    }
    let m = re.exec(str || ''), uri = {}, i = 14;
    while (i--) {
        uri[parts[i]] = m[i] || '';
    }
    if (b != -1 && e != -1) {
        uri.source = src;
        uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ':');
        uri.authority = uri.authority.replace('[', '').replace(']', '').replace(/;/g, ':');
        uri.ipv6uri = true;
    }
    uri.pathNames = pathNames(uri, uri['path']);
    uri.queryKey = queryKey(uri, uri['query']);
    return uri;
}
function pathNames(obj, path) {
    const regx = /\/{2,9}/g, names = path.replace(regx, "/").split("/");
    if (path.slice(0, 1) == '/' || path.length === 0) {
        names.splice(0, 1);
    }
    if (path.slice(-1) == '/') {
        names.splice(names.length - 1, 1);
    }
    return names;
}
function queryKey(uri, query) {
    const data = {};
    query.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function ($0, $1, $2) {
        if ($1) {
            data[$1] = $2;
        }
    });
    return data;
}

;// ./node_modules/engine.io-client/build/esm/socket.js







const withEventListeners = typeof addEventListener === "function" &&
    typeof removeEventListener === "function";
const OFFLINE_EVENT_LISTENERS = [];
if (withEventListeners) {
    // within a ServiceWorker, any event handler for the 'offline' event must be added on the initial evaluation of the
    // script, so we create one single event listener here which will forward the event to the socket instances
    addEventListener("offline", () => {
        OFFLINE_EVENT_LISTENERS.forEach((listener) => listener());
    }, false);
}
/**
 * This class provides a WebSocket-like interface to connect to an Engine.IO server. The connection will be established
 * with one of the available low-level transports, like HTTP long-polling, WebSocket or WebTransport.
 *
 * This class comes without upgrade mechanism, which means that it will keep the first low-level transport that
 * successfully establishes the connection.
 *
 * In order to allow tree-shaking, there are no transports included, that's why the `transports` option is mandatory.
 *
 * @example
 * import { SocketWithoutUpgrade, WebSocket } from "engine.io-client";
 *
 * const socket = new SocketWithoutUpgrade({
 *   transports: [WebSocket]
 * });
 *
 * socket.on("open", () => {
 *   socket.send("hello");
 * });
 *
 * @see SocketWithUpgrade
 * @see Socket
 */
class SocketWithoutUpgrade extends Emitter {
    /**
     * Socket constructor.
     *
     * @param {String|Object} uri - uri or options
     * @param {Object} opts - options
     */
    constructor(uri, opts) {
        super();
        this.binaryType = defaultBinaryType;
        this.writeBuffer = [];
        this._prevBufferLen = 0;
        this._pingInterval = -1;
        this._pingTimeout = -1;
        this._maxPayload = -1;
        /**
         * The expiration timestamp of the {@link _pingTimeoutTimer} object is tracked, in case the timer is throttled and the
         * callback is not fired on time. This can happen for example when a laptop is suspended or when a phone is locked.
         */
        this._pingTimeoutTime = Infinity;
        if (uri && "object" === typeof uri) {
            opts = uri;
            uri = null;
        }
        if (uri) {
            const parsedUri = parse(uri);
            opts.hostname = parsedUri.host;
            opts.secure =
                parsedUri.protocol === "https" || parsedUri.protocol === "wss";
            opts.port = parsedUri.port;
            if (parsedUri.query)
                opts.query = parsedUri.query;
        }
        else if (opts.host) {
            opts.hostname = parse(opts.host).host;
        }
        installTimerFunctions(this, opts);
        this.secure =
            null != opts.secure
                ? opts.secure
                : typeof location !== "undefined" && "https:" === location.protocol;
        if (opts.hostname && !opts.port) {
            // if no port is specified manually, use the protocol default
            opts.port = this.secure ? "443" : "80";
        }
        this.hostname =
            opts.hostname ||
                (typeof location !== "undefined" ? location.hostname : "localhost");
        this.port =
            opts.port ||
                (typeof location !== "undefined" && location.port
                    ? location.port
                    : this.secure
                        ? "443"
                        : "80");
        this.transports = [];
        this._transportsByName = {};
        opts.transports.forEach((t) => {
            const transportName = t.prototype.name;
            this.transports.push(transportName);
            this._transportsByName[transportName] = t;
        });
        this.opts = Object.assign({
            path: "/engine.io",
            agent: false,
            withCredentials: false,
            upgrade: true,
            timestampParam: "t",
            rememberUpgrade: false,
            addTrailingSlash: true,
            rejectUnauthorized: true,
            perMessageDeflate: {
                threshold: 1024,
            },
            transportOptions: {},
            closeOnBeforeunload: false,
        }, opts);
        this.opts.path =
            this.opts.path.replace(/\/$/, "") +
                (this.opts.addTrailingSlash ? "/" : "");
        if (typeof this.opts.query === "string") {
            this.opts.query = parseqs_decode(this.opts.query);
        }
        if (withEventListeners) {
            if (this.opts.closeOnBeforeunload) {
                // Firefox closes the connection when the "beforeunload" event is emitted but not Chrome. This event listener
                // ensures every browser behaves the same (no "disconnect" event at the Socket.IO level when the page is
                // closed/reloaded)
                this._beforeunloadEventListener = () => {
                    if (this.transport) {
                        // silently close the transport
                        this.transport.removeAllListeners();
                        this.transport.close();
                    }
                };
                addEventListener("beforeunload", this._beforeunloadEventListener, false);
            }
            if (this.hostname !== "localhost") {
                this._offlineEventListener = () => {
                    this._onClose("transport close", {
                        description: "network connection lost",
                    });
                };
                OFFLINE_EVENT_LISTENERS.push(this._offlineEventListener);
            }
        }
        if (this.opts.withCredentials) {
            this._cookieJar = createCookieJar();
        }
        this._open();
    }
    /**
     * Creates transport of the given type.
     *
     * @param {String} name - transport name
     * @return {Transport}
     * @private
     */
    createTransport(name) {
        const query = Object.assign({}, this.opts.query);
        // append engine.io protocol identifier
        query.EIO = protocol;
        // transport name
        query.transport = name;
        // session id if we already have one
        if (this.id)
            query.sid = this.id;
        const opts = Object.assign({}, this.opts, {
            query,
            socket: this,
            hostname: this.hostname,
            secure: this.secure,
            port: this.port,
        }, this.opts.transportOptions[name]);
        return new this._transportsByName[name](opts);
    }
    /**
     * Initializes transport to use and starts probe.
     *
     * @private
     */
    _open() {
        if (this.transports.length === 0) {
            // Emit error on next tick so it can be listened to
            this.setTimeoutFn(() => {
                this.emitReserved("error", "No transports available");
            }, 0);
            return;
        }
        const transportName = this.opts.rememberUpgrade &&
            SocketWithoutUpgrade.priorWebsocketSuccess &&
            this.transports.indexOf("websocket") !== -1
            ? "websocket"
            : this.transports[0];
        this.readyState = "opening";
        const transport = this.createTransport(transportName);
        transport.open();
        this.setTransport(transport);
    }
    /**
     * Sets the current transport. Disables the existing one (if any).
     *
     * @private
     */
    setTransport(transport) {
        if (this.transport) {
            this.transport.removeAllListeners();
        }
        // set up transport
        this.transport = transport;
        // set up transport listeners
        transport
            .on("drain", this._onDrain.bind(this))
            .on("packet", this._onPacket.bind(this))
            .on("error", this._onError.bind(this))
            .on("close", (reason) => this._onClose("transport close", reason));
    }
    /**
     * Called when connection is deemed open.
     *
     * @private
     */
    onOpen() {
        this.readyState = "open";
        SocketWithoutUpgrade.priorWebsocketSuccess =
            "websocket" === this.transport.name;
        this.emitReserved("open");
        this.flush();
    }
    /**
     * Handles a packet.
     *
     * @private
     */
    _onPacket(packet) {
        if ("opening" === this.readyState ||
            "open" === this.readyState ||
            "closing" === this.readyState) {
            this.emitReserved("packet", packet);
            // Socket is live - any packet counts
            this.emitReserved("heartbeat");
            switch (packet.type) {
                case "open":
                    this.onHandshake(JSON.parse(packet.data));
                    break;
                case "ping":
                    this._sendPacket("pong");
                    this.emitReserved("ping");
                    this.emitReserved("pong");
                    this._resetPingTimeout();
                    break;
                case "error":
                    const err = new Error("server error");
                    // @ts-ignore
                    err.code = packet.data;
                    this._onError(err);
                    break;
                case "message":
                    this.emitReserved("data", packet.data);
                    this.emitReserved("message", packet.data);
                    break;
            }
        }
        else {
        }
    }
    /**
     * Called upon handshake completion.
     *
     * @param {Object} data - handshake obj
     * @private
     */
    onHandshake(data) {
        this.emitReserved("handshake", data);
        this.id = data.sid;
        this.transport.query.sid = data.sid;
        this._pingInterval = data.pingInterval;
        this._pingTimeout = data.pingTimeout;
        this._maxPayload = data.maxPayload;
        this.onOpen();
        // In case open handler closes socket
        if ("closed" === this.readyState)
            return;
        this._resetPingTimeout();
    }
    /**
     * Sets and resets ping timeout timer based on server pings.
     *
     * @private
     */
    _resetPingTimeout() {
        this.clearTimeoutFn(this._pingTimeoutTimer);
        const delay = this._pingInterval + this._pingTimeout;
        this._pingTimeoutTime = Date.now() + delay;
        this._pingTimeoutTimer = this.setTimeoutFn(() => {
            this._onClose("ping timeout");
        }, delay);
        if (this.opts.autoUnref) {
            this._pingTimeoutTimer.unref();
        }
    }
    /**
     * Called on `drain` event
     *
     * @private
     */
    _onDrain() {
        this.writeBuffer.splice(0, this._prevBufferLen);
        // setting prevBufferLen = 0 is very important
        // for example, when upgrading, upgrade packet is sent over,
        // and a nonzero prevBufferLen could cause problems on `drain`
        this._prevBufferLen = 0;
        if (0 === this.writeBuffer.length) {
            this.emitReserved("drain");
        }
        else {
            this.flush();
        }
    }
    /**
     * Flush write buffers.
     *
     * @private
     */
    flush() {
        if ("closed" !== this.readyState &&
            this.transport.writable &&
            !this.upgrading &&
            this.writeBuffer.length) {
            const packets = this._getWritablePackets();
            this.transport.send(packets);
            // keep track of current length of writeBuffer
            // splice writeBuffer and callbackBuffer on `drain`
            this._prevBufferLen = packets.length;
            this.emitReserved("flush");
        }
    }
    /**
     * Ensure the encoded size of the writeBuffer is below the maxPayload value sent by the server (only for HTTP
     * long-polling)
     *
     * @private
     */
    _getWritablePackets() {
        const shouldCheckPayloadSize = this._maxPayload &&
            this.transport.name === "polling" &&
            this.writeBuffer.length > 1;
        if (!shouldCheckPayloadSize) {
            return this.writeBuffer;
        }
        let payloadSize = 1; // first packet type
        for (let i = 0; i < this.writeBuffer.length; i++) {
            const data = this.writeBuffer[i].data;
            if (data) {
                payloadSize += byteLength(data);
            }
            if (i > 0 && payloadSize > this._maxPayload) {
                return this.writeBuffer.slice(0, i);
            }
            payloadSize += 2; // separator + packet type
        }
        return this.writeBuffer;
    }
    /**
     * Checks whether the heartbeat timer has expired but the socket has not yet been notified.
     *
     * Note: this method is private for now because it does not really fit the WebSocket API, but if we put it in the
     * `write()` method then the message would not be buffered by the Socket.IO client.
     *
     * @return {boolean}
     * @private
     */
    /* private */ _hasPingExpired() {
        if (!this._pingTimeoutTime)
            return true;
        const hasExpired = Date.now() > this._pingTimeoutTime;
        if (hasExpired) {
            this._pingTimeoutTime = 0;
            nextTick(() => {
                this._onClose("ping timeout");
            }, this.setTimeoutFn);
        }
        return hasExpired;
    }
    /**
     * Sends a message.
     *
     * @param {String} msg - message.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @return {Socket} for chaining.
     */
    write(msg, options, fn) {
        this._sendPacket("message", msg, options, fn);
        return this;
    }
    /**
     * Sends a message. Alias of {@link Socket#write}.
     *
     * @param {String} msg - message.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @return {Socket} for chaining.
     */
    send(msg, options, fn) {
        this._sendPacket("message", msg, options, fn);
        return this;
    }
    /**
     * Sends a packet.
     *
     * @param {String} type: packet type.
     * @param {String} data.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @private
     */
    _sendPacket(type, data, options, fn) {
        if ("function" === typeof data) {
            fn = data;
            data = undefined;
        }
        if ("function" === typeof options) {
            fn = options;
            options = null;
        }
        if ("closing" === this.readyState || "closed" === this.readyState) {
            return;
        }
        options = options || {};
        options.compress = false !== options.compress;
        const packet = {
            type: type,
            data: data,
            options: options,
        };
        this.emitReserved("packetCreate", packet);
        this.writeBuffer.push(packet);
        if (fn)
            this.once("flush", fn);
        this.flush();
    }
    /**
     * Closes the connection.
     */
    close() {
        const close = () => {
            this._onClose("forced close");
            this.transport.close();
        };
        const cleanupAndClose = () => {
            this.off("upgrade", cleanupAndClose);
            this.off("upgradeError", cleanupAndClose);
            close();
        };
        const waitForUpgrade = () => {
            // wait for upgrade to finish since we can't send packets while pausing a transport
            this.once("upgrade", cleanupAndClose);
            this.once("upgradeError", cleanupAndClose);
        };
        if ("opening" === this.readyState || "open" === this.readyState) {
            this.readyState = "closing";
            if (this.writeBuffer.length) {
                this.once("drain", () => {
                    if (this.upgrading) {
                        waitForUpgrade();
                    }
                    else {
                        close();
                    }
                });
            }
            else if (this.upgrading) {
                waitForUpgrade();
            }
            else {
                close();
            }
        }
        return this;
    }
    /**
     * Called upon transport error
     *
     * @private
     */
    _onError(err) {
        SocketWithoutUpgrade.priorWebsocketSuccess = false;
        if (this.opts.tryAllTransports &&
            this.transports.length > 1 &&
            this.readyState === "opening") {
            this.transports.shift();
            return this._open();
        }
        this.emitReserved("error", err);
        this._onClose("transport error", err);
    }
    /**
     * Called upon transport close.
     *
     * @private
     */
    _onClose(reason, description) {
        if ("opening" === this.readyState ||
            "open" === this.readyState ||
            "closing" === this.readyState) {
            // clear timers
            this.clearTimeoutFn(this._pingTimeoutTimer);
            // stop event from firing again for transport
            this.transport.removeAllListeners("close");
            // ensure transport won't stay open
            this.transport.close();
            // ignore further transport communication
            this.transport.removeAllListeners();
            if (withEventListeners) {
                if (this._beforeunloadEventListener) {
                    removeEventListener("beforeunload", this._beforeunloadEventListener, false);
                }
                if (this._offlineEventListener) {
                    const i = OFFLINE_EVENT_LISTENERS.indexOf(this._offlineEventListener);
                    if (i !== -1) {
                        OFFLINE_EVENT_LISTENERS.splice(i, 1);
                    }
                }
            }
            // set ready state
            this.readyState = "closed";
            // clear session id
            this.id = null;
            // emit close event
            this.emitReserved("close", reason, description);
            // clean buffers after, so users can still
            // grab the buffers on `close` event
            this.writeBuffer = [];
            this._prevBufferLen = 0;
        }
    }
}
SocketWithoutUpgrade.protocol = protocol;
/**
 * This class provides a WebSocket-like interface to connect to an Engine.IO server. The connection will be established
 * with one of the available low-level transports, like HTTP long-polling, WebSocket or WebTransport.
 *
 * This class comes with an upgrade mechanism, which means that once the connection is established with the first
 * low-level transport, it will try to upgrade to a better transport.
 *
 * In order to allow tree-shaking, there are no transports included, that's why the `transports` option is mandatory.
 *
 * @example
 * import { SocketWithUpgrade, WebSocket } from "engine.io-client";
 *
 * const socket = new SocketWithUpgrade({
 *   transports: [WebSocket]
 * });
 *
 * socket.on("open", () => {
 *   socket.send("hello");
 * });
 *
 * @see SocketWithoutUpgrade
 * @see Socket
 */
class SocketWithUpgrade extends SocketWithoutUpgrade {
    constructor() {
        super(...arguments);
        this._upgrades = [];
    }
    onOpen() {
        super.onOpen();
        if ("open" === this.readyState && this.opts.upgrade) {
            for (let i = 0; i < this._upgrades.length; i++) {
                this._probe(this._upgrades[i]);
            }
        }
    }
    /**
     * Probes a transport.
     *
     * @param {String} name - transport name
     * @private
     */
    _probe(name) {
        let transport = this.createTransport(name);
        let failed = false;
        SocketWithoutUpgrade.priorWebsocketSuccess = false;
        const onTransportOpen = () => {
            if (failed)
                return;
            transport.send([{ type: "ping", data: "probe" }]);
            transport.once("packet", (msg) => {
                if (failed)
                    return;
                if ("pong" === msg.type && "probe" === msg.data) {
                    this.upgrading = true;
                    this.emitReserved("upgrading", transport);
                    if (!transport)
                        return;
                    SocketWithoutUpgrade.priorWebsocketSuccess =
                        "websocket" === transport.name;
                    this.transport.pause(() => {
                        if (failed)
                            return;
                        if ("closed" === this.readyState)
                            return;
                        cleanup();
                        this.setTransport(transport);
                        transport.send([{ type: "upgrade" }]);
                        this.emitReserved("upgrade", transport);
                        transport = null;
                        this.upgrading = false;
                        this.flush();
                    });
                }
                else {
                    const err = new Error("probe error");
                    // @ts-ignore
                    err.transport = transport.name;
                    this.emitReserved("upgradeError", err);
                }
            });
        };
        function freezeTransport() {
            if (failed)
                return;
            // Any callback called by transport should be ignored since now
            failed = true;
            cleanup();
            transport.close();
            transport = null;
        }
        // Handle any error that happens while probing
        const onerror = (err) => {
            const error = new Error("probe error: " + err);
            // @ts-ignore
            error.transport = transport.name;
            freezeTransport();
            this.emitReserved("upgradeError", error);
        };
        function onTransportClose() {
            onerror("transport closed");
        }
        // When the socket is closed while we're probing
        function onclose() {
            onerror("socket closed");
        }
        // When the socket is upgraded while we're probing
        function onupgrade(to) {
            if (transport && to.name !== transport.name) {
                freezeTransport();
            }
        }
        // Remove all listeners on the transport and on self
        const cleanup = () => {
            transport.removeListener("open", onTransportOpen);
            transport.removeListener("error", onerror);
            transport.removeListener("close", onTransportClose);
            this.off("close", onclose);
            this.off("upgrading", onupgrade);
        };
        transport.once("open", onTransportOpen);
        transport.once("error", onerror);
        transport.once("close", onTransportClose);
        this.once("close", onclose);
        this.once("upgrading", onupgrade);
        if (this._upgrades.indexOf("webtransport") !== -1 &&
            name !== "webtransport") {
            // favor WebTransport
            this.setTimeoutFn(() => {
                if (!failed) {
                    transport.open();
                }
            }, 200);
        }
        else {
            transport.open();
        }
    }
    onHandshake(data) {
        this._upgrades = this._filterUpgrades(data.upgrades);
        super.onHandshake(data);
    }
    /**
     * Filters upgrades, returning only those matching client transports.
     *
     * @param {Array} upgrades - server upgrades
     * @private
     */
    _filterUpgrades(upgrades) {
        const filteredUpgrades = [];
        for (let i = 0; i < upgrades.length; i++) {
            if (~this.transports.indexOf(upgrades[i]))
                filteredUpgrades.push(upgrades[i]);
        }
        return filteredUpgrades;
    }
}
/**
 * This class provides a WebSocket-like interface to connect to an Engine.IO server. The connection will be established
 * with one of the available low-level transports, like HTTP long-polling, WebSocket or WebTransport.
 *
 * This class comes with an upgrade mechanism, which means that once the connection is established with the first
 * low-level transport, it will try to upgrade to a better transport.
 *
 * @example
 * import { Socket } from "engine.io-client";
 *
 * const socket = new Socket();
 *
 * socket.on("open", () => {
 *   socket.send("hello");
 * });
 *
 * @see SocketWithoutUpgrade
 * @see SocketWithUpgrade
 */
class Socket extends SocketWithUpgrade {
    constructor(uri, opts = {}) {
        const o = typeof uri === "object" ? uri : opts;
        if (!o.transports ||
            (o.transports && typeof o.transports[0] === "string")) {
            o.transports = (o.transports || ["polling", "websocket", "webtransport"])
                .map((transportName) => transports[transportName])
                .filter((t) => !!t);
        }
        super(uri, o);
    }
}

;// ./node_modules/engine.io-client/build/esm/transports/polling-fetch.js

/**
 * HTTP long-polling based on the built-in `fetch()` method.
 *
 * Usage: browser, Node.js (since v18), Deno, Bun
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/fetch
 * @see https://caniuse.com/fetch
 * @see https://nodejs.org/api/globals.html#fetch
 */
class Fetch extends (/* unused pure expression or super */ null && (Polling)) {
    doPoll() {
        this._fetch()
            .then((res) => {
            if (!res.ok) {
                return this.onError("fetch read error", res.status, res);
            }
            res.text().then((data) => this.onData(data));
        })
            .catch((err) => {
            this.onError("fetch read error", err);
        });
    }
    doWrite(data, callback) {
        this._fetch(data)
            .then((res) => {
            if (!res.ok) {
                return this.onError("fetch write error", res.status, res);
            }
            callback();
        })
            .catch((err) => {
            this.onError("fetch write error", err);
        });
    }
    _fetch(data) {
        var _a;
        const isPost = data !== undefined;
        const headers = new Headers(this.opts.extraHeaders);
        if (isPost) {
            headers.set("content-type", "text/plain;charset=UTF-8");
        }
        (_a = this.socket._cookieJar) === null || _a === void 0 ? void 0 : _a.appendCookies(headers);
        return fetch(this.uri(), {
            method: isPost ? "POST" : "GET",
            body: isPost ? data : null,
            headers,
            credentials: this.opts.withCredentials ? "include" : "omit",
        }).then((res) => {
            var _a;
            // @ts-ignore getSetCookie() was added in Node.js v19.7.0
            (_a = this.socket._cookieJar) === null || _a === void 0 ? void 0 : _a.parseCookies(res.headers.getSetCookie());
            return res;
        });
    }
}

;// ./node_modules/engine.io-client/build/esm/index.js



const esm_protocol = Socket.protocol;












;// ./node_modules/socket.io-client/build/esm/url.js

/**
 * URL parser.
 *
 * @param uri - url
 * @param path - the request path of the connection
 * @param loc - An object meant to mimic window.location.
 *        Defaults to window.location.
 * @public
 */
function url(uri, path = "", loc) {
    let obj = uri;
    // default to window.location
    loc = loc || (typeof location !== "undefined" && location);
    if (null == uri)
        uri = loc.protocol + "//" + loc.host;
    // relative path support
    if (typeof uri === "string") {
        if ("/" === uri.charAt(0)) {
            if ("/" === uri.charAt(1)) {
                uri = loc.protocol + uri;
            }
            else {
                uri = loc.host + uri;
            }
        }
        if (!/^(https?|wss?):\/\//.test(uri)) {
            if ("undefined" !== typeof loc) {
                uri = loc.protocol + "//" + uri;
            }
            else {
                uri = "https://" + uri;
            }
        }
        // parse
        obj = parse(uri);
    }
    // make sure we treat `localhost:80` and `localhost` equally
    if (!obj.port) {
        if (/^(http|ws)$/.test(obj.protocol)) {
            obj.port = "80";
        }
        else if (/^(http|ws)s$/.test(obj.protocol)) {
            obj.port = "443";
        }
    }
    obj.path = obj.path || "/";
    const ipv6 = obj.host.indexOf(":") !== -1;
    const host = ipv6 ? "[" + obj.host + "]" : obj.host;
    // define unique id
    obj.id = obj.protocol + "://" + host + ":" + obj.port + path;
    // define href
    obj.href =
        obj.protocol +
            "://" +
            host +
            (loc && loc.port === obj.port ? "" : ":" + obj.port);
    return obj;
}

;// ./node_modules/socket.io-parser/build/esm/is-binary.js
const is_binary_withNativeArrayBuffer = typeof ArrayBuffer === "function";
const is_binary_isView = (obj) => {
    return typeof ArrayBuffer.isView === "function"
        ? ArrayBuffer.isView(obj)
        : obj.buffer instanceof ArrayBuffer;
};
const is_binary_toString = Object.prototype.toString;
const is_binary_withNativeBlob = typeof Blob === "function" ||
    (typeof Blob !== "undefined" &&
        is_binary_toString.call(Blob) === "[object BlobConstructor]");
const withNativeFile = typeof File === "function" ||
    (typeof File !== "undefined" &&
        is_binary_toString.call(File) === "[object FileConstructor]");
/**
 * Returns true if obj is a Buffer, an ArrayBuffer, a Blob or a File.
 *
 * @private
 */
function isBinary(obj) {
    return ((is_binary_withNativeArrayBuffer && (obj instanceof ArrayBuffer || is_binary_isView(obj))) ||
        (is_binary_withNativeBlob && obj instanceof Blob) ||
        (withNativeFile && obj instanceof File));
}
function hasBinary(obj, toJSON) {
    if (!obj || typeof obj !== "object") {
        return false;
    }
    if (Array.isArray(obj)) {
        for (let i = 0, l = obj.length; i < l; i++) {
            if (hasBinary(obj[i])) {
                return true;
            }
        }
        return false;
    }
    if (isBinary(obj)) {
        return true;
    }
    if (obj.toJSON &&
        typeof obj.toJSON === "function" &&
        arguments.length === 1) {
        return hasBinary(obj.toJSON(), true);
    }
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
            return true;
        }
    }
    return false;
}

;// ./node_modules/socket.io-parser/build/esm/binary.js

/**
 * Replaces every Buffer | ArrayBuffer | Blob | File in packet with a numbered placeholder.
 *
 * @param {Object} packet - socket.io event packet
 * @return {Object} with deconstructed packet and list of buffers
 * @public
 */
function deconstructPacket(packet) {
    const buffers = [];
    const packetData = packet.data;
    const pack = packet;
    pack.data = _deconstructPacket(packetData, buffers);
    pack.attachments = buffers.length; // number of binary 'attachments'
    return { packet: pack, buffers: buffers };
}
function _deconstructPacket(data, buffers) {
    if (!data)
        return data;
    if (isBinary(data)) {
        const placeholder = { _placeholder: true, num: buffers.length };
        buffers.push(data);
        return placeholder;
    }
    else if (Array.isArray(data)) {
        const newData = new Array(data.length);
        for (let i = 0; i < data.length; i++) {
            newData[i] = _deconstructPacket(data[i], buffers);
        }
        return newData;
    }
    else if (typeof data === "object" && !(data instanceof Date)) {
        const newData = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                newData[key] = _deconstructPacket(data[key], buffers);
            }
        }
        return newData;
    }
    return data;
}
/**
 * Reconstructs a binary packet from its placeholder packet and buffers
 *
 * @param {Object} packet - event packet with placeholders
 * @param {Array} buffers - binary buffers to put in placeholder positions
 * @return {Object} reconstructed packet
 * @public
 */
function reconstructPacket(packet, buffers) {
    packet.data = _reconstructPacket(packet.data, buffers);
    delete packet.attachments; // no longer useful
    return packet;
}
function _reconstructPacket(data, buffers) {
    if (!data)
        return data;
    if (data && data._placeholder === true) {
        const isIndexValid = typeof data.num === "number" &&
            data.num >= 0 &&
            data.num < buffers.length;
        if (isIndexValid) {
            return buffers[data.num]; // appropriate buffer (should be natural order anyway)
        }
        else {
            throw new Error("illegal attachments");
        }
    }
    else if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
            data[i] = _reconstructPacket(data[i], buffers);
        }
    }
    else if (typeof data === "object") {
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                data[key] = _reconstructPacket(data[key], buffers);
            }
        }
    }
    return data;
}

;// ./node_modules/socket.io-parser/build/esm/index.js



/**
 * These strings must not be used as event names, as they have a special meaning.
 */
const RESERVED_EVENTS = [
    "connect",
    "connect_error",
    "disconnect",
    "disconnecting",
    "newListener",
    "removeListener", // used by the Node.js EventEmitter
];
/**
 * Protocol version.
 *
 * @public
 */
const build_esm_protocol = 5;
var PacketType;
(function (PacketType) {
    PacketType[PacketType["CONNECT"] = 0] = "CONNECT";
    PacketType[PacketType["DISCONNECT"] = 1] = "DISCONNECT";
    PacketType[PacketType["EVENT"] = 2] = "EVENT";
    PacketType[PacketType["ACK"] = 3] = "ACK";
    PacketType[PacketType["CONNECT_ERROR"] = 4] = "CONNECT_ERROR";
    PacketType[PacketType["BINARY_EVENT"] = 5] = "BINARY_EVENT";
    PacketType[PacketType["BINARY_ACK"] = 6] = "BINARY_ACK";
})(PacketType || (PacketType = {}));
/**
 * A socket.io Encoder instance
 */
class Encoder {
    /**
     * Encoder constructor
     *
     * @param {function} replacer - custom replacer to pass down to JSON.parse
     */
    constructor(replacer) {
        this.replacer = replacer;
    }
    /**
     * Encode a packet as a single string if non-binary, or as a
     * buffer sequence, depending on packet type.
     *
     * @param {Object} obj - packet object
     */
    encode(obj) {
        if (obj.type === PacketType.EVENT || obj.type === PacketType.ACK) {
            if (hasBinary(obj)) {
                return this.encodeAsBinary({
                    type: obj.type === PacketType.EVENT
                        ? PacketType.BINARY_EVENT
                        : PacketType.BINARY_ACK,
                    nsp: obj.nsp,
                    data: obj.data,
                    id: obj.id,
                });
            }
        }
        return [this.encodeAsString(obj)];
    }
    /**
     * Encode packet as string.
     */
    encodeAsString(obj) {
        // first is type
        let str = "" + obj.type;
        // attachments if we have them
        if (obj.type === PacketType.BINARY_EVENT ||
            obj.type === PacketType.BINARY_ACK) {
            str += obj.attachments + "-";
        }
        // if we have a namespace other than `/`
        // we append it followed by a comma `,`
        if (obj.nsp && "/" !== obj.nsp) {
            str += obj.nsp + ",";
        }
        // immediately followed by the id
        if (null != obj.id) {
            str += obj.id;
        }
        // json data
        if (null != obj.data) {
            str += JSON.stringify(obj.data, this.replacer);
        }
        return str;
    }
    /**
     * Encode packet as 'buffer sequence' by removing blobs, and
     * deconstructing packet into object with placeholders and
     * a list of buffers.
     */
    encodeAsBinary(obj) {
        const deconstruction = deconstructPacket(obj);
        const pack = this.encodeAsString(deconstruction.packet);
        const buffers = deconstruction.buffers;
        buffers.unshift(pack); // add packet info to beginning of data list
        return buffers; // write all the buffers
    }
}
// see https://stackoverflow.com/questions/8511281/check-if-a-value-is-an-object-in-javascript
function isObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
}
/**
 * A socket.io Decoder instance
 *
 * @return {Object} decoder
 */
class Decoder extends Emitter {
    /**
     * Decoder constructor
     *
     * @param {function} reviver - custom reviver to pass down to JSON.stringify
     */
    constructor(reviver) {
        super();
        this.reviver = reviver;
    }
    /**
     * Decodes an encoded packet string into packet JSON.
     *
     * @param {String} obj - encoded packet
     */
    add(obj) {
        let packet;
        if (typeof obj === "string") {
            if (this.reconstructor) {
                throw new Error("got plaintext data when reconstructing a packet");
            }
            packet = this.decodeString(obj);
            const isBinaryEvent = packet.type === PacketType.BINARY_EVENT;
            if (isBinaryEvent || packet.type === PacketType.BINARY_ACK) {
                packet.type = isBinaryEvent ? PacketType.EVENT : PacketType.ACK;
                // binary packet's json
                this.reconstructor = new BinaryReconstructor(packet);
                // no attachments, labeled binary but no binary data to follow
                if (packet.attachments === 0) {
                    super.emitReserved("decoded", packet);
                }
            }
            else {
                // non-binary full packet
                super.emitReserved("decoded", packet);
            }
        }
        else if (isBinary(obj) || obj.base64) {
            // raw binary data
            if (!this.reconstructor) {
                throw new Error("got binary data when not reconstructing a packet");
            }
            else {
                packet = this.reconstructor.takeBinaryData(obj);
                if (packet) {
                    // received final buffer
                    this.reconstructor = null;
                    super.emitReserved("decoded", packet);
                }
            }
        }
        else {
            throw new Error("Unknown type: " + obj);
        }
    }
    /**
     * Decode a packet String (JSON data)
     *
     * @param {String} str
     * @return {Object} packet
     */
    decodeString(str) {
        let i = 0;
        // look up type
        const p = {
            type: Number(str.charAt(0)),
        };
        if (PacketType[p.type] === undefined) {
            throw new Error("unknown packet type " + p.type);
        }
        // look up attachments if type binary
        if (p.type === PacketType.BINARY_EVENT ||
            p.type === PacketType.BINARY_ACK) {
            const start = i + 1;
            while (str.charAt(++i) !== "-" && i != str.length) { }
            const buf = str.substring(start, i);
            if (buf != Number(buf) || str.charAt(i) !== "-") {
                throw new Error("Illegal attachments");
            }
            p.attachments = Number(buf);
        }
        // look up namespace (if any)
        if ("/" === str.charAt(i + 1)) {
            const start = i + 1;
            while (++i) {
                const c = str.charAt(i);
                if ("," === c)
                    break;
                if (i === str.length)
                    break;
            }
            p.nsp = str.substring(start, i);
        }
        else {
            p.nsp = "/";
        }
        // look up id
        const next = str.charAt(i + 1);
        if ("" !== next && Number(next) == next) {
            const start = i + 1;
            while (++i) {
                const c = str.charAt(i);
                if (null == c || Number(c) != c) {
                    --i;
                    break;
                }
                if (i === str.length)
                    break;
            }
            p.id = Number(str.substring(start, i + 1));
        }
        // look up json data
        if (str.charAt(++i)) {
            const payload = this.tryParse(str.substr(i));
            if (Decoder.isPayloadValid(p.type, payload)) {
                p.data = payload;
            }
            else {
                throw new Error("invalid payload");
            }
        }
        return p;
    }
    tryParse(str) {
        try {
            return JSON.parse(str, this.reviver);
        }
        catch (e) {
            return false;
        }
    }
    static isPayloadValid(type, payload) {
        switch (type) {
            case PacketType.CONNECT:
                return isObject(payload);
            case PacketType.DISCONNECT:
                return payload === undefined;
            case PacketType.CONNECT_ERROR:
                return typeof payload === "string" || isObject(payload);
            case PacketType.EVENT:
            case PacketType.BINARY_EVENT:
                return (Array.isArray(payload) &&
                    (typeof payload[0] === "number" ||
                        (typeof payload[0] === "string" &&
                            RESERVED_EVENTS.indexOf(payload[0]) === -1)));
            case PacketType.ACK:
            case PacketType.BINARY_ACK:
                return Array.isArray(payload);
        }
    }
    /**
     * Deallocates a parser's resources
     */
    destroy() {
        if (this.reconstructor) {
            this.reconstructor.finishedReconstruction();
            this.reconstructor = null;
        }
    }
}
/**
 * A manager of a binary event's 'buffer sequence'. Should
 * be constructed whenever a packet of type BINARY_EVENT is
 * decoded.
 *
 * @param {Object} packet
 * @return {BinaryReconstructor} initialized reconstructor
 */
class BinaryReconstructor {
    constructor(packet) {
        this.packet = packet;
        this.buffers = [];
        this.reconPack = packet;
    }
    /**
     * Method to be called when binary data received from connection
     * after a BINARY_EVENT packet.
     *
     * @param {Buffer | ArrayBuffer} binData - the raw binary data received
     * @return {null | Object} returns null if more binary data is expected or
     *   a reconstructed packet object if all buffers have been received.
     */
    takeBinaryData(binData) {
        this.buffers.push(binData);
        if (this.buffers.length === this.reconPack.attachments) {
            // done with buffer list
            const packet = reconstructPacket(this.reconPack, this.buffers);
            this.finishedReconstruction();
            return packet;
        }
        return null;
    }
    /**
     * Cleans up binary packet reconstruction variables.
     */
    finishedReconstruction() {
        this.reconPack = null;
        this.buffers = [];
    }
}

;// ./node_modules/socket.io-client/build/esm/on.js
function on(obj, ev, fn) {
    obj.on(ev, fn);
    return function subDestroy() {
        obj.off(ev, fn);
    };
}

;// ./node_modules/socket.io-client/build/esm/socket.js



/**
 * Internal events.
 * These events can't be emitted by the user.
 */
const socket_RESERVED_EVENTS = Object.freeze({
    connect: 1,
    connect_error: 1,
    disconnect: 1,
    disconnecting: 1,
    // EventEmitter reserved events: https://nodejs.org/api/events.html#events_event_newlistener
    newListener: 1,
    removeListener: 1,
});
/**
 * A Socket is the fundamental class for interacting with the server.
 *
 * A Socket belongs to a certain Namespace (by default /) and uses an underlying {@link Manager} to communicate.
 *
 * @example
 * const socket = io();
 *
 * socket.on("connect", () => {
 *   console.log("connected");
 * });
 *
 * // send an event to the server
 * socket.emit("foo", "bar");
 *
 * socket.on("foobar", () => {
 *   // an event was received from the server
 * });
 *
 * // upon disconnection
 * socket.on("disconnect", (reason) => {
 *   console.log(`disconnected due to ${reason}`);
 * });
 */
class socket_Socket extends Emitter {
    /**
     * `Socket` constructor.
     */
    constructor(io, nsp, opts) {
        super();
        /**
         * Whether the socket is currently connected to the server.
         *
         * @example
         * const socket = io();
         *
         * socket.on("connect", () => {
         *   console.log(socket.connected); // true
         * });
         *
         * socket.on("disconnect", () => {
         *   console.log(socket.connected); // false
         * });
         */
        this.connected = false;
        /**
         * Whether the connection state was recovered after a temporary disconnection. In that case, any missed packets will
         * be transmitted by the server.
         */
        this.recovered = false;
        /**
         * Buffer for packets received before the CONNECT packet
         */
        this.receiveBuffer = [];
        /**
         * Buffer for packets that will be sent once the socket is connected
         */
        this.sendBuffer = [];
        /**
         * The queue of packets to be sent with retry in case of failure.
         *
         * Packets are sent one by one, each waiting for the server acknowledgement, in order to guarantee the delivery order.
         * @private
         */
        this._queue = [];
        /**
         * A sequence to generate the ID of the {@link QueuedPacket}.
         * @private
         */
        this._queueSeq = 0;
        this.ids = 0;
        /**
         * A map containing acknowledgement handlers.
         *
         * The `withError` attribute is used to differentiate handlers that accept an error as first argument:
         *
         * - `socket.emit("test", (err, value) => { ... })` with `ackTimeout` option
         * - `socket.timeout(5000).emit("test", (err, value) => { ... })`
         * - `const value = await socket.emitWithAck("test")`
         *
         * From those that don't:
         *
         * - `socket.emit("test", (value) => { ... });`
         *
         * In the first case, the handlers will be called with an error when:
         *
         * - the timeout is reached
         * - the socket gets disconnected
         *
         * In the second case, the handlers will be simply discarded upon disconnection, since the client will never receive
         * an acknowledgement from the server.
         *
         * @private
         */
        this.acks = {};
        this.flags = {};
        this.io = io;
        this.nsp = nsp;
        if (opts && opts.auth) {
            this.auth = opts.auth;
        }
        this._opts = Object.assign({}, opts);
        if (this.io._autoConnect)
            this.open();
    }
    /**
     * Whether the socket is currently disconnected
     *
     * @example
     * const socket = io();
     *
     * socket.on("connect", () => {
     *   console.log(socket.disconnected); // false
     * });
     *
     * socket.on("disconnect", () => {
     *   console.log(socket.disconnected); // true
     * });
     */
    get disconnected() {
        return !this.connected;
    }
    /**
     * Subscribe to open, close and packet events
     *
     * @private
     */
    subEvents() {
        if (this.subs)
            return;
        const io = this.io;
        this.subs = [
            on(io, "open", this.onopen.bind(this)),
            on(io, "packet", this.onpacket.bind(this)),
            on(io, "error", this.onerror.bind(this)),
            on(io, "close", this.onclose.bind(this)),
        ];
    }
    /**
     * Whether the Socket will try to reconnect when its Manager connects or reconnects.
     *
     * @example
     * const socket = io();
     *
     * console.log(socket.active); // true
     *
     * socket.on("disconnect", (reason) => {
     *   if (reason === "io server disconnect") {
     *     // the disconnection was initiated by the server, you need to manually reconnect
     *     console.log(socket.active); // false
     *   }
     *   // else the socket will automatically try to reconnect
     *   console.log(socket.active); // true
     * });
     */
    get active() {
        return !!this.subs;
    }
    /**
     * "Opens" the socket.
     *
     * @example
     * const socket = io({
     *   autoConnect: false
     * });
     *
     * socket.connect();
     */
    connect() {
        if (this.connected)
            return this;
        this.subEvents();
        if (!this.io["_reconnecting"])
            this.io.open(); // ensure open
        if ("open" === this.io._readyState)
            this.onopen();
        return this;
    }
    /**
     * Alias for {@link connect()}.
     */
    open() {
        return this.connect();
    }
    /**
     * Sends a `message` event.
     *
     * This method mimics the WebSocket.send() method.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
     *
     * @example
     * socket.send("hello");
     *
     * // this is equivalent to
     * socket.emit("message", "hello");
     *
     * @return self
     */
    send(...args) {
        args.unshift("message");
        this.emit.apply(this, args);
        return this;
    }
    /**
     * Override `emit`.
     * If the event is in `events`, it's emitted normally.
     *
     * @example
     * socket.emit("hello", "world");
     *
     * // all serializable datastructures are supported (no need to call JSON.stringify)
     * socket.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
     *
     * // with an acknowledgement from the server
     * socket.emit("hello", "world", (val) => {
     *   // ...
     * });
     *
     * @return self
     */
    emit(ev, ...args) {
        var _a, _b, _c;
        if (socket_RESERVED_EVENTS.hasOwnProperty(ev)) {
            throw new Error('"' + ev.toString() + '" is a reserved event name');
        }
        args.unshift(ev);
        if (this._opts.retries && !this.flags.fromQueue && !this.flags.volatile) {
            this._addToQueue(args);
            return this;
        }
        const packet = {
            type: PacketType.EVENT,
            data: args,
        };
        packet.options = {};
        packet.options.compress = this.flags.compress !== false;
        // event ack callback
        if ("function" === typeof args[args.length - 1]) {
            const id = this.ids++;
            const ack = args.pop();
            this._registerAckCallback(id, ack);
            packet.id = id;
        }
        const isTransportWritable = (_b = (_a = this.io.engine) === null || _a === void 0 ? void 0 : _a.transport) === null || _b === void 0 ? void 0 : _b.writable;
        const isConnected = this.connected && !((_c = this.io.engine) === null || _c === void 0 ? void 0 : _c._hasPingExpired());
        const discardPacket = this.flags.volatile && !isTransportWritable;
        if (discardPacket) {
        }
        else if (isConnected) {
            this.notifyOutgoingListeners(packet);
            this.packet(packet);
        }
        else {
            this.sendBuffer.push(packet);
        }
        this.flags = {};
        return this;
    }
    /**
     * @private
     */
    _registerAckCallback(id, ack) {
        var _a;
        const timeout = (_a = this.flags.timeout) !== null && _a !== void 0 ? _a : this._opts.ackTimeout;
        if (timeout === undefined) {
            this.acks[id] = ack;
            return;
        }
        // @ts-ignore
        const timer = this.io.setTimeoutFn(() => {
            delete this.acks[id];
            for (let i = 0; i < this.sendBuffer.length; i++) {
                if (this.sendBuffer[i].id === id) {
                    this.sendBuffer.splice(i, 1);
                }
            }
            ack.call(this, new Error("operation has timed out"));
        }, timeout);
        const fn = (...args) => {
            // @ts-ignore
            this.io.clearTimeoutFn(timer);
            ack.apply(this, args);
        };
        fn.withError = true;
        this.acks[id] = fn;
    }
    /**
     * Emits an event and waits for an acknowledgement
     *
     * @example
     * // without timeout
     * const response = await socket.emitWithAck("hello", "world");
     *
     * // with a specific timeout
     * try {
     *   const response = await socket.timeout(1000).emitWithAck("hello", "world");
     * } catch (err) {
     *   // the server did not acknowledge the event in the given delay
     * }
     *
     * @return a Promise that will be fulfilled when the server acknowledges the event
     */
    emitWithAck(ev, ...args) {
        return new Promise((resolve, reject) => {
            const fn = (arg1, arg2) => {
                return arg1 ? reject(arg1) : resolve(arg2);
            };
            fn.withError = true;
            args.push(fn);
            this.emit(ev, ...args);
        });
    }
    /**
     * Add the packet to the queue.
     * @param args
     * @private
     */
    _addToQueue(args) {
        let ack;
        if (typeof args[args.length - 1] === "function") {
            ack = args.pop();
        }
        const packet = {
            id: this._queueSeq++,
            tryCount: 0,
            pending: false,
            args,
            flags: Object.assign({ fromQueue: true }, this.flags),
        };
        args.push((err, ...responseArgs) => {
            if (packet !== this._queue[0]) {
                // the packet has already been acknowledged
                return;
            }
            const hasError = err !== null;
            if (hasError) {
                if (packet.tryCount > this._opts.retries) {
                    this._queue.shift();
                    if (ack) {
                        ack(err);
                    }
                }
            }
            else {
                this._queue.shift();
                if (ack) {
                    ack(null, ...responseArgs);
                }
            }
            packet.pending = false;
            return this._drainQueue();
        });
        this._queue.push(packet);
        this._drainQueue();
    }
    /**
     * Send the first packet of the queue, and wait for an acknowledgement from the server.
     * @param force - whether to resend a packet that has not been acknowledged yet
     *
     * @private
     */
    _drainQueue(force = false) {
        if (!this.connected || this._queue.length === 0) {
            return;
        }
        const packet = this._queue[0];
        if (packet.pending && !force) {
            return;
        }
        packet.pending = true;
        packet.tryCount++;
        this.flags = packet.flags;
        this.emit.apply(this, packet.args);
    }
    /**
     * Sends a packet.
     *
     * @param packet
     * @private
     */
    packet(packet) {
        packet.nsp = this.nsp;
        this.io._packet(packet);
    }
    /**
     * Called upon engine `open`.
     *
     * @private
     */
    onopen() {
        if (typeof this.auth == "function") {
            this.auth((data) => {
                this._sendConnectPacket(data);
            });
        }
        else {
            this._sendConnectPacket(this.auth);
        }
    }
    /**
     * Sends a CONNECT packet to initiate the Socket.IO session.
     *
     * @param data
     * @private
     */
    _sendConnectPacket(data) {
        this.packet({
            type: PacketType.CONNECT,
            data: this._pid
                ? Object.assign({ pid: this._pid, offset: this._lastOffset }, data)
                : data,
        });
    }
    /**
     * Called upon engine or manager `error`.
     *
     * @param err
     * @private
     */
    onerror(err) {
        if (!this.connected) {
            this.emitReserved("connect_error", err);
        }
    }
    /**
     * Called upon engine `close`.
     *
     * @param reason
     * @param description
     * @private
     */
    onclose(reason, description) {
        this.connected = false;
        delete this.id;
        this.emitReserved("disconnect", reason, description);
        this._clearAcks();
    }
    /**
     * Clears the acknowledgement handlers upon disconnection, since the client will never receive an acknowledgement from
     * the server.
     *
     * @private
     */
    _clearAcks() {
        Object.keys(this.acks).forEach((id) => {
            const isBuffered = this.sendBuffer.some((packet) => String(packet.id) === id);
            if (!isBuffered) {
                // note: handlers that do not accept an error as first argument are ignored here
                const ack = this.acks[id];
                delete this.acks[id];
                if (ack.withError) {
                    ack.call(this, new Error("socket has been disconnected"));
                }
            }
        });
    }
    /**
     * Called with socket packet.
     *
     * @param packet
     * @private
     */
    onpacket(packet) {
        const sameNamespace = packet.nsp === this.nsp;
        if (!sameNamespace)
            return;
        switch (packet.type) {
            case PacketType.CONNECT:
                if (packet.data && packet.data.sid) {
                    this.onconnect(packet.data.sid, packet.data.pid);
                }
                else {
                    this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
                }
                break;
            case PacketType.EVENT:
            case PacketType.BINARY_EVENT:
                this.onevent(packet);
                break;
            case PacketType.ACK:
            case PacketType.BINARY_ACK:
                this.onack(packet);
                break;
            case PacketType.DISCONNECT:
                this.ondisconnect();
                break;
            case PacketType.CONNECT_ERROR:
                this.destroy();
                const err = new Error(packet.data.message);
                // @ts-ignore
                err.data = packet.data.data;
                this.emitReserved("connect_error", err);
                break;
        }
    }
    /**
     * Called upon a server event.
     *
     * @param packet
     * @private
     */
    onevent(packet) {
        const args = packet.data || [];
        if (null != packet.id) {
            args.push(this.ack(packet.id));
        }
        if (this.connected) {
            this.emitEvent(args);
        }
        else {
            this.receiveBuffer.push(Object.freeze(args));
        }
    }
    emitEvent(args) {
        if (this._anyListeners && this._anyListeners.length) {
            const listeners = this._anyListeners.slice();
            for (const listener of listeners) {
                listener.apply(this, args);
            }
        }
        super.emit.apply(this, args);
        if (this._pid && args.length && typeof args[args.length - 1] === "string") {
            this._lastOffset = args[args.length - 1];
        }
    }
    /**
     * Produces an ack callback to emit with an event.
     *
     * @private
     */
    ack(id) {
        const self = this;
        let sent = false;
        return function (...args) {
            // prevent double callbacks
            if (sent)
                return;
            sent = true;
            self.packet({
                type: PacketType.ACK,
                id: id,
                data: args,
            });
        };
    }
    /**
     * Called upon a server acknowledgement.
     *
     * @param packet
     * @private
     */
    onack(packet) {
        const ack = this.acks[packet.id];
        if (typeof ack !== "function") {
            return;
        }
        delete this.acks[packet.id];
        // @ts-ignore FIXME ack is incorrectly inferred as 'never'
        if (ack.withError) {
            packet.data.unshift(null);
        }
        // @ts-ignore
        ack.apply(this, packet.data);
    }
    /**
     * Called upon server connect.
     *
     * @private
     */
    onconnect(id, pid) {
        this.id = id;
        this.recovered = pid && this._pid === pid;
        this._pid = pid; // defined only if connection state recovery is enabled
        this.connected = true;
        this.emitBuffered();
        this.emitReserved("connect");
        this._drainQueue(true);
    }
    /**
     * Emit buffered events (received and emitted).
     *
     * @private
     */
    emitBuffered() {
        this.receiveBuffer.forEach((args) => this.emitEvent(args));
        this.receiveBuffer = [];
        this.sendBuffer.forEach((packet) => {
            this.notifyOutgoingListeners(packet);
            this.packet(packet);
        });
        this.sendBuffer = [];
    }
    /**
     * Called upon server disconnect.
     *
     * @private
     */
    ondisconnect() {
        this.destroy();
        this.onclose("io server disconnect");
    }
    /**
     * Called upon forced client/server side disconnections,
     * this method ensures the manager stops tracking us and
     * that reconnections don't get triggered for this.
     *
     * @private
     */
    destroy() {
        if (this.subs) {
            // clean subscriptions to avoid reconnections
            this.subs.forEach((subDestroy) => subDestroy());
            this.subs = undefined;
        }
        this.io["_destroy"](this);
    }
    /**
     * Disconnects the socket manually. In that case, the socket will not try to reconnect.
     *
     * If this is the last active Socket instance of the {@link Manager}, the low-level connection will be closed.
     *
     * @example
     * const socket = io();
     *
     * socket.on("disconnect", (reason) => {
     *   // console.log(reason); prints "io client disconnect"
     * });
     *
     * socket.disconnect();
     *
     * @return self
     */
    disconnect() {
        if (this.connected) {
            this.packet({ type: PacketType.DISCONNECT });
        }
        // remove socket from pool
        this.destroy();
        if (this.connected) {
            // fire events
            this.onclose("io client disconnect");
        }
        return this;
    }
    /**
     * Alias for {@link disconnect()}.
     *
     * @return self
     */
    close() {
        return this.disconnect();
    }
    /**
     * Sets the compress flag.
     *
     * @example
     * socket.compress(false).emit("hello");
     *
     * @param compress - if `true`, compresses the sending data
     * @return self
     */
    compress(compress) {
        this.flags.compress = compress;
        return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
     * ready to send messages.
     *
     * @example
     * socket.volatile.emit("hello"); // the server may or may not receive it
     *
     * @returns self
     */
    get volatile() {
        this.flags.volatile = true;
        return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
     * given number of milliseconds have elapsed without an acknowledgement from the server:
     *
     * @example
     * socket.timeout(5000).emit("my-event", (err) => {
     *   if (err) {
     *     // the server did not acknowledge the event in the given delay
     *   }
     * });
     *
     * @returns self
     */
    timeout(timeout) {
        this.flags.timeout = timeout;
        return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * @example
     * socket.onAny((event, ...args) => {
     *   console.log(`got ${event}`);
     * });
     *
     * @param listener
     */
    onAny(listener) {
        this._anyListeners = this._anyListeners || [];
        this._anyListeners.push(listener);
        return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * @example
     * socket.prependAny((event, ...args) => {
     *   console.log(`got event ${event}`);
     * });
     *
     * @param listener
     */
    prependAny(listener) {
        this._anyListeners = this._anyListeners || [];
        this._anyListeners.unshift(listener);
        return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   console.log(`got event ${event}`);
     * }
     *
     * socket.onAny(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAny(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAny();
     *
     * @param listener
     */
    offAny(listener) {
        if (!this._anyListeners) {
            return this;
        }
        if (listener) {
            const listeners = this._anyListeners;
            for (let i = 0; i < listeners.length; i++) {
                if (listener === listeners[i]) {
                    listeners.splice(i, 1);
                    return this;
                }
            }
        }
        else {
            this._anyListeners = [];
        }
        return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAny() {
        return this._anyListeners || [];
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.onAnyOutgoing((event, ...args) => {
     *   console.log(`sent event ${event}`);
     * });
     *
     * @param listener
     */
    onAnyOutgoing(listener) {
        this._anyOutgoingListeners = this._anyOutgoingListeners || [];
        this._anyOutgoingListeners.push(listener);
        return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.prependAnyOutgoing((event, ...args) => {
     *   console.log(`sent event ${event}`);
     * });
     *
     * @param listener
     */
    prependAnyOutgoing(listener) {
        this._anyOutgoingListeners = this._anyOutgoingListeners || [];
        this._anyOutgoingListeners.unshift(listener);
        return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   console.log(`sent event ${event}`);
     * }
     *
     * socket.onAnyOutgoing(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAnyOutgoing(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAnyOutgoing();
     *
     * @param [listener] - the catch-all listener (optional)
     */
    offAnyOutgoing(listener) {
        if (!this._anyOutgoingListeners) {
            return this;
        }
        if (listener) {
            const listeners = this._anyOutgoingListeners;
            for (let i = 0; i < listeners.length; i++) {
                if (listener === listeners[i]) {
                    listeners.splice(i, 1);
                    return this;
                }
            }
        }
        else {
            this._anyOutgoingListeners = [];
        }
        return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAnyOutgoing() {
        return this._anyOutgoingListeners || [];
    }
    /**
     * Notify the listeners for each packet sent
     *
     * @param packet
     *
     * @private
     */
    notifyOutgoingListeners(packet) {
        if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
            const listeners = this._anyOutgoingListeners.slice();
            for (const listener of listeners) {
                listener.apply(this, packet.data);
            }
        }
    }
}

;// ./node_modules/socket.io-client/build/esm/contrib/backo2.js
/**
 * Initialize backoff timer with `opts`.
 *
 * - `min` initial timeout in milliseconds [100]
 * - `max` max timeout [10000]
 * - `jitter` [0]
 * - `factor` [2]
 *
 * @param {Object} opts
 * @api public
 */
function Backoff(opts) {
    opts = opts || {};
    this.ms = opts.min || 100;
    this.max = opts.max || 10000;
    this.factor = opts.factor || 2;
    this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
    this.attempts = 0;
}
/**
 * Return the backoff duration.
 *
 * @return {Number}
 * @api public
 */
Backoff.prototype.duration = function () {
    var ms = this.ms * Math.pow(this.factor, this.attempts++);
    if (this.jitter) {
        var rand = Math.random();
        var deviation = Math.floor(rand * this.jitter * ms);
        ms = (Math.floor(rand * 10) & 1) == 0 ? ms - deviation : ms + deviation;
    }
    return Math.min(ms, this.max) | 0;
};
/**
 * Reset the number of attempts.
 *
 * @api public
 */
Backoff.prototype.reset = function () {
    this.attempts = 0;
};
/**
 * Set the minimum duration
 *
 * @api public
 */
Backoff.prototype.setMin = function (min) {
    this.ms = min;
};
/**
 * Set the maximum duration
 *
 * @api public
 */
Backoff.prototype.setMax = function (max) {
    this.max = max;
};
/**
 * Set the jitter
 *
 * @api public
 */
Backoff.prototype.setJitter = function (jitter) {
    this.jitter = jitter;
};

;// ./node_modules/socket.io-client/build/esm/manager.js






class Manager extends Emitter {
    constructor(uri, opts) {
        var _a;
        super();
        this.nsps = {};
        this.subs = [];
        if (uri && "object" === typeof uri) {
            opts = uri;
            uri = undefined;
        }
        opts = opts || {};
        opts.path = opts.path || "/socket.io";
        this.opts = opts;
        installTimerFunctions(this, opts);
        this.reconnection(opts.reconnection !== false);
        this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
        this.reconnectionDelay(opts.reconnectionDelay || 1000);
        this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
        this.randomizationFactor((_a = opts.randomizationFactor) !== null && _a !== void 0 ? _a : 0.5);
        this.backoff = new Backoff({
            min: this.reconnectionDelay(),
            max: this.reconnectionDelayMax(),
            jitter: this.randomizationFactor(),
        });
        this.timeout(null == opts.timeout ? 20000 : opts.timeout);
        this._readyState = "closed";
        this.uri = uri;
        const _parser = opts.parser || socket_io_parser_build_esm_namespaceObject;
        this.encoder = new _parser.Encoder();
        this.decoder = new _parser.Decoder();
        this._autoConnect = opts.autoConnect !== false;
        if (this._autoConnect)
            this.open();
    }
    reconnection(v) {
        if (!arguments.length)
            return this._reconnection;
        this._reconnection = !!v;
        if (!v) {
            this.skipReconnect = true;
        }
        return this;
    }
    reconnectionAttempts(v) {
        if (v === undefined)
            return this._reconnectionAttempts;
        this._reconnectionAttempts = v;
        return this;
    }
    reconnectionDelay(v) {
        var _a;
        if (v === undefined)
            return this._reconnectionDelay;
        this._reconnectionDelay = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMin(v);
        return this;
    }
    randomizationFactor(v) {
        var _a;
        if (v === undefined)
            return this._randomizationFactor;
        this._randomizationFactor = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setJitter(v);
        return this;
    }
    reconnectionDelayMax(v) {
        var _a;
        if (v === undefined)
            return this._reconnectionDelayMax;
        this._reconnectionDelayMax = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMax(v);
        return this;
    }
    timeout(v) {
        if (!arguments.length)
            return this._timeout;
        this._timeout = v;
        return this;
    }
    /**
     * Starts trying to reconnect if reconnection is enabled and we have not
     * started reconnecting yet
     *
     * @private
     */
    maybeReconnectOnOpen() {
        // Only try to reconnect if it's the first time we're connecting
        if (!this._reconnecting &&
            this._reconnection &&
            this.backoff.attempts === 0) {
            // keeps reconnection from firing twice for the same reconnection loop
            this.reconnect();
        }
    }
    /**
     * Sets the current transport `socket`.
     *
     * @param {Function} fn - optional, callback
     * @return self
     * @public
     */
    open(fn) {
        if (~this._readyState.indexOf("open"))
            return this;
        this.engine = new Socket(this.uri, this.opts);
        const socket = this.engine;
        const self = this;
        this._readyState = "opening";
        this.skipReconnect = false;
        // emit `open`
        const openSubDestroy = on(socket, "open", function () {
            self.onopen();
            fn && fn();
        });
        const onError = (err) => {
            this.cleanup();
            this._readyState = "closed";
            this.emitReserved("error", err);
            if (fn) {
                fn(err);
            }
            else {
                // Only do this if there is no fn to handle the error
                this.maybeReconnectOnOpen();
            }
        };
        // emit `error`
        const errorSub = on(socket, "error", onError);
        if (false !== this._timeout) {
            const timeout = this._timeout;
            // set timer
            const timer = this.setTimeoutFn(() => {
                openSubDestroy();
                onError(new Error("timeout"));
                socket.close();
            }, timeout);
            if (this.opts.autoUnref) {
                timer.unref();
            }
            this.subs.push(() => {
                this.clearTimeoutFn(timer);
            });
        }
        this.subs.push(openSubDestroy);
        this.subs.push(errorSub);
        return this;
    }
    /**
     * Alias for open()
     *
     * @return self
     * @public
     */
    connect(fn) {
        return this.open(fn);
    }
    /**
     * Called upon transport open.
     *
     * @private
     */
    onopen() {
        // clear old subs
        this.cleanup();
        // mark as open
        this._readyState = "open";
        this.emitReserved("open");
        // add new subs
        const socket = this.engine;
        this.subs.push(on(socket, "ping", this.onping.bind(this)), on(socket, "data", this.ondata.bind(this)), on(socket, "error", this.onerror.bind(this)), on(socket, "close", this.onclose.bind(this)), 
        // @ts-ignore
        on(this.decoder, "decoded", this.ondecoded.bind(this)));
    }
    /**
     * Called upon a ping.
     *
     * @private
     */
    onping() {
        this.emitReserved("ping");
    }
    /**
     * Called with data.
     *
     * @private
     */
    ondata(data) {
        try {
            this.decoder.add(data);
        }
        catch (e) {
            this.onclose("parse error", e);
        }
    }
    /**
     * Called when parser fully decodes a packet.
     *
     * @private
     */
    ondecoded(packet) {
        // the nextTick call prevents an exception in a user-provided event listener from triggering a disconnection due to a "parse error"
        nextTick(() => {
            this.emitReserved("packet", packet);
        }, this.setTimeoutFn);
    }
    /**
     * Called upon socket error.
     *
     * @private
     */
    onerror(err) {
        this.emitReserved("error", err);
    }
    /**
     * Creates a new socket for the given `nsp`.
     *
     * @return {Socket}
     * @public
     */
    socket(nsp, opts) {
        let socket = this.nsps[nsp];
        if (!socket) {
            socket = new socket_Socket(this, nsp, opts);
            this.nsps[nsp] = socket;
        }
        else if (this._autoConnect && !socket.active) {
            socket.connect();
        }
        return socket;
    }
    /**
     * Called upon a socket close.
     *
     * @param socket
     * @private
     */
    _destroy(socket) {
        const nsps = Object.keys(this.nsps);
        for (const nsp of nsps) {
            const socket = this.nsps[nsp];
            if (socket.active) {
                return;
            }
        }
        this._close();
    }
    /**
     * Writes a packet.
     *
     * @param packet
     * @private
     */
    _packet(packet) {
        const encodedPackets = this.encoder.encode(packet);
        for (let i = 0; i < encodedPackets.length; i++) {
            this.engine.write(encodedPackets[i], packet.options);
        }
    }
    /**
     * Clean up transport subscriptions and packet buffer.
     *
     * @private
     */
    cleanup() {
        this.subs.forEach((subDestroy) => subDestroy());
        this.subs.length = 0;
        this.decoder.destroy();
    }
    /**
     * Close the current socket.
     *
     * @private
     */
    _close() {
        this.skipReconnect = true;
        this._reconnecting = false;
        this.onclose("forced close");
    }
    /**
     * Alias for close()
     *
     * @private
     */
    disconnect() {
        return this._close();
    }
    /**
     * Called when:
     *
     * - the low-level engine is closed
     * - the parser encountered a badly formatted packet
     * - all sockets are disconnected
     *
     * @private
     */
    onclose(reason, description) {
        var _a;
        this.cleanup();
        (_a = this.engine) === null || _a === void 0 ? void 0 : _a.close();
        this.backoff.reset();
        this._readyState = "closed";
        this.emitReserved("close", reason, description);
        if (this._reconnection && !this.skipReconnect) {
            this.reconnect();
        }
    }
    /**
     * Attempt a reconnection.
     *
     * @private
     */
    reconnect() {
        if (this._reconnecting || this.skipReconnect)
            return this;
        const self = this;
        if (this.backoff.attempts >= this._reconnectionAttempts) {
            this.backoff.reset();
            this.emitReserved("reconnect_failed");
            this._reconnecting = false;
        }
        else {
            const delay = this.backoff.duration();
            this._reconnecting = true;
            const timer = this.setTimeoutFn(() => {
                if (self.skipReconnect)
                    return;
                this.emitReserved("reconnect_attempt", self.backoff.attempts);
                // check again for the case socket closed in above events
                if (self.skipReconnect)
                    return;
                self.open((err) => {
                    if (err) {
                        self._reconnecting = false;
                        self.reconnect();
                        this.emitReserved("reconnect_error", err);
                    }
                    else {
                        self.onreconnect();
                    }
                });
            }, delay);
            if (this.opts.autoUnref) {
                timer.unref();
            }
            this.subs.push(() => {
                this.clearTimeoutFn(timer);
            });
        }
    }
    /**
     * Called upon successful reconnect.
     *
     * @private
     */
    onreconnect() {
        const attempt = this.backoff.attempts;
        this._reconnecting = false;
        this.backoff.reset();
        this.emitReserved("reconnect", attempt);
    }
}

;// ./node_modules/socket.io-client/build/esm/index.js



/**
 * Managers cache.
 */
const cache = {};
function esm_lookup(uri, opts) {
    if (typeof uri === "object") {
        opts = uri;
        uri = undefined;
    }
    opts = opts || {};
    const parsed = url(uri, opts.path || "/socket.io");
    const source = parsed.source;
    const id = parsed.id;
    const path = parsed.path;
    const sameNamespace = cache[id] && path in cache[id]["nsps"];
    const newConnection = opts.forceNew ||
        opts["force new connection"] ||
        false === opts.multiplex ||
        sameNamespace;
    let io;
    if (newConnection) {
        io = new Manager(source, opts);
    }
    else {
        if (!cache[id]) {
            cache[id] = new Manager(source, opts);
        }
        io = cache[id];
    }
    if (parsed.query && !opts.query) {
        opts.query = parsed.queryKey;
    }
    return io.socket(parsed.path, opts);
}
// so that "lookup" can be used both as a function (e.g. `io(...)`) and as a
// namespace (e.g. `io.connect(...)`), for backward compatibility
Object.assign(esm_lookup, {
    Manager: Manager,
    Socket: socket_Socket,
    io: esm_lookup,
    connect: esm_lookup,
});
/**
 * Protocol version.
 *
 * @public
 */

/**
 * Expose constructors for standalone build.
 *
 * @public
 */



;// ./src/workerblob.ts
const workerBlob = new Blob([`
// Worker code starts here
const WORLD_WIDTH = 10000;  // Changed from 2000 to 10000
const WORLD_HEIGHT = 2000;
const FISH_DETECTION_RADIUS = 500;  // How far fish can detect players
const PLAYER_BASE_SPEED = 5;  // Base player speed to match
const FISH_RETURN_SPEED = 0.5;  // Speed at which fish return to their normal behavior
const ENEMY_COUNT = 100;
const OBSTACLE_COUNT = 20;
const ENEMY_CORAL_PROBABILITY = 0.3;
const ENEMY_CORAL_HEALTH = 50;
const ENEMY_CORAL_DAMAGE = 5;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_DAMAGE = 10;
const ITEM_COUNT = 10;
const MAX_INVENTORY_SIZE = 5;
const PLAYER_SIZE = 40;
const COLLISION_RADIUS = PLAYER_SIZE / 2;
const ENEMY_SIZE = 40;
const RESPAWN_INVULNERABILITY_TIME = 3000;
const KNOCKBACK_FORCE = 20;
const KNOCKBACK_RECOVERY_SPEED = 0.9;
const DECORATION_COUNT = 100;  // Number of palms to spawn
var BASE_XP_REQUIREMENT = 100;
var XP_MULTIPLIER = 1.5;
var HEALTH_PER_LEVEL = 10;
var DAMAGE_PER_LEVEL = 2;
var DROP_CHANCES = {
    common: 0.1, // 10% chance
    uncommon: 0.2, // 20% chance
    rare: 0.3, // 30% chance
    epic: 0.4, // 40% chance
    legendary: 0.5, // 50% chance
    mythic: 0.75 // 75% chance
};

const ENEMY_TIERS = {
    common: { health: 20, speed: 0.5, damage: 5, probability: 0.4 },
    uncommon: { health: 40, speed: 0.75, damage: 10, probability: 0.3 },
    rare: { health: 60, speed: 1, damage: 15, probability: 0.15 },
    epic: { health: 80, speed: 1.25, damage: 20, probability: 0.1 },
    legendary: { health: 100, speed: 1.5, damage: 25, probability: 0.04 },
    mythic: { health: 150, speed: 2, damage: 30, probability: 0.01 }
};
var ZONE_BOUNDARIES = {
    common: { start: 0, end: 2000 },
    uncommon: { start: 2000, end: 4000 },
    rare: { start: 4000, end: 6000 },
    epic: { start: 6000, end: 8000 },
    legendary: { start: 8000, end: 9000 },
    mythic: { start: 9000, end: WORLD_WIDTH }
};
var ENEMY_SIZE_MULTIPLIERS = {
    common: 1.0,
    uncommon: 1.2,
    rare: 1.4,
    epic: 1.6,
    legendary: 1.8,
    mythic: 2.0
};

const players = {};
const enemies = [];
const obstacles = [];
const items = [];
const dots = [];
const decorations = [];
const sands = [];

// Add near the top with other constants
const ITEM_RARITY_COLORS = {
    common: '#808080',      // Gray
    uncommon: '#1eff00',    // Green
    rare: '#0070dd',       // Blue
    epic: '#a335ee',       // Purple
    legendary: '#ff8000',   // Orange
    mythic: '#ff0000'      // Red
};

// Helper function to get random position in a specific zone
function getRandomPositionInZone(zoneIndex) {
    const zoneWidth = WORLD_WIDTH / 6;  // 6 zones
    const startX = zoneIndex * zoneWidth;
    
    // For legendary and mythic zones, ensure they're in the rightmost areas
    if (zoneIndex >= 4) {  // Legendary and Mythic zones
        const adjustedStartX = WORLD_WIDTH - (6 - zoneIndex) * (zoneWidth / 2);  // Start from right side
        return {
            x: adjustedStartX + Math.random() * (WORLD_WIDTH - adjustedStartX),
            y: Math.random() * WORLD_HEIGHT
        };
    }
    
    return {
        x: startX + Math.random() * zoneWidth,
        y: Math.random() * WORLD_HEIGHT
    };
}
function getXPFromEnemy(enemy) {
    var tierMultipliers = {
        common: 10,
        uncommon: 20,
        rare: 40,
        epic: 80,
        legendary: 160,
        mythic: 320
    };
    return tierMultipliers[enemy.tier];
}
function addXPToPlayer(player, xp) {
    player.xp += xp;
    while (player.xp >= player.xpToNextLevel) {
        player.xp -= player.xpToNextLevel;
        player.level++;
        player.xpToNextLevel = calculateXPRequirement(player.level);
        handleLevelUp(player);
    }
    socket.emit('xpGained', {
        playerId: player.id,
        xp: xp,
        totalXp: player.xp,
        level: player.level,
        xpToNextLevel: player.xpToNextLevel,
        maxHealth: player.maxHealth,
        damage: player.damage
    });
}
function handleLevelUp(player) {
    player.maxHealth += HEALTH_PER_LEVEL;
    player.health = player.maxHealth;
    player.damage += DAMAGE_PER_LEVEL;
    socket.emit('levelUp', {
        playerId: player.id,
        level: player.level,
        maxHealth: player.maxHealth,
        damage: player.damage
    });
}
function respawnPlayer(player) {
    // Determine spawn zone based on player level without losing levels
    var spawnX;
    if (player.level <= 5) {
        spawnX = Math.random() * ZONE_BOUNDARIES.common.end;
    }
    else if (player.level <= 10) {
        spawnX = ZONE_BOUNDARIES.uncommon.start + Math.random() * (ZONE_BOUNDARIES.uncommon.end - ZONE_BOUNDARIES.uncommon.start);
    }
    else if (player.level <= 15) {
        spawnX = ZONE_BOUNDARIES.rare.start + Math.random() * (ZONE_BOUNDARIES.rare.end - ZONE_BOUNDARIES.rare.start);
    }
    else if (player.level <= 25) {
        spawnX = ZONE_BOUNDARIES.epic.start + Math.random() * (ZONE_BOUNDARIES.epic.end - ZONE_BOUNDARIES.epic.start);
    }
    else if (player.level <= 40) {
        spawnX = ZONE_BOUNDARIES.legendary.start + Math.random() * (ZONE_BOUNDARIES.legendary.end - ZONE_BOUNDARIES.legendary.start);
    }
    else {
        spawnX = ZONE_BOUNDARIES.mythic.start + Math.random() * (ZONE_BOUNDARIES.mythic.end - ZONE_BOUNDARIES.mythic.start);
    }
    // Reset health and position but keep level and stats
    player.health = player.maxHealth;
    player.x = spawnX;
    player.y = Math.random() * WORLD_HEIGHT;
    player.score = Math.max(0, player.score - 10); // Still lose some score
    player.inventory = [];
    player.isInvulnerable = true;
    // Just notify about respawn without level loss
    socket.emit('playerRespawned', player);
    setTimeout(function () {
        player.isInvulnerable = false;
    }, RESPAWN_INVULNERABILITY_TIME);
}

// Add these constants at the top with other constants


function moveEnemies() {
    if (!enemies || !enemies.length) return;  // Guard against undefined enemies array
    
    enemies.forEach(enemy => {
        if (!enemy) return;  // Guard against undefined enemy objects
        
        try {
            // Apply knockback if it exists
            if (enemy.knockbackX) {
                enemy.knockbackX *= KNOCKBACK_RECOVERY_SPEED;
                enemy.x += enemy.knockbackX;
                if (Math.abs(enemy.knockbackX) < 0.1) enemy.knockbackX = 0;
            }
            if (enemy.knockbackY) {
                enemy.knockbackY *= KNOCKBACK_RECOVERY_SPEED;
                enemy.y += enemy.knockbackY;
                if (Math.abs(enemy.knockbackY) < 0.1) enemy.knockbackY = 0;
            }

            // Find nearest player for fish behavior
            let nearestPlayer = null;
            let nearestDistance = Infinity;
            
            Object.values(players).forEach(player => {
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestPlayer = player;
                }
            });

            // Different movement patterns based on enemy type
            if (enemy.type === 'octopus') {
                // Random movement for octopus
                enemy.x += (Math.random() * 4 - 2) * (enemy.speed || 1);
                enemy.y += (Math.random() * 4 - 2) * (enemy.speed || 1);
            } else {
                // Fish behavior
                if (nearestPlayer && nearestDistance < FISH_DETECTION_RADIUS) {
                    // Fish detected player - match player speed
                    const dx = nearestPlayer.x - enemy.x;
                    const dy = nearestPlayer.y - enemy.y;
                    const angle = Math.atan2(dy, dx);
                    
                    // Update enemy angle for proper facing direction
                    enemy.angle = angle;
                    
                    // Calculate chase speed based on player's current speed
                    const playerSpeed = 16;
                    
                    // Match player speed but consider enemy tier for slight variations
                    const tierSpeedMultiplier = ENEMY_TIERS[enemy.tier].speed;
                    const chaseSpeed = playerSpeed * tierSpeedMultiplier;
                    
                    // Move towards player matching their speed
                    enemy.x += Math.cos(angle) * chaseSpeed;
                    enemy.y += Math.sin(angle) * chaseSpeed;
                    
                    // Mark fish as hostile
                    enemy.isHostile = true;
                } else {
                    // Normal fish behavior
                    enemy.isHostile = false;
                    
                    // Return to normal speed gradually
                    const normalSpeed = ENEMY_TIERS[enemy.tier].speed * 2;
                    enemy.x += Math.cos(enemy.angle || 0) * normalSpeed;
                    enemy.y += Math.sin(enemy.angle || 0) * normalSpeed;
                    
                    // Randomly change direction occasionally
                    if (Math.random() < 0.02) {
                        enemy.angle = Math.random() * Math.PI * 2;
                    }
                }
            }

            // Keep enemies in their respective zones
            const zoneWidth = WORLD_WIDTH / 6;
            const tierZones = {
                common: 0,
                uncommon: 1,
                rare: 2,
                epic: 3,
                legendary: 4,
                mythic: 5
            };
            
            const zoneIndex = tierZones[enemy.tier] || 0;
            const zoneStartX = zoneIndex * zoneWidth;
            const zoneEndX = (zoneIndex + 1) * zoneWidth;
            
            // Add some overlap between zones (10% on each side)
            const overlap = zoneWidth * 0.1;
            const minX = Math.max(0, zoneStartX - overlap);
            const maxX = Math.min(WORLD_WIDTH, zoneEndX + overlap);
            
            // Constrain enemy position to its zone
            enemy.x = Math.max(minX, Math.min(maxX, enemy.x));
            enemy.y = Math.max(0, Math.min(WORLD_HEIGHT, enemy.y));
        } catch (error) {
            console.error('Error moving enemy:', error, enemy);
        }
    });

    try {
        // Filter out any undefined enemies before emitting
        const validEnemies = enemies.filter(enemy => enemy !== undefined);
        socket.emit('enemiesUpdate', validEnemies);
    } catch (error) {
        console.error('Error emitting enemies update:', error);
    }
}

// Update creation functions to use zones
function createDecoration() {
    const zoneIndex = Math.floor(Math.random() * 6);  // 6 zones
    const pos = getRandomPositionInZone(zoneIndex);
    return {
        x: pos.x,
        y: pos.y,
        scale: 0.5 + Math.random() * 1.5
    };
}

function createEnemy() {
    const tierRoll = Math.random();
    let tier = 'common';
    let cumulativeProbability = 0;
    for (const [t, data] of Object.entries(ENEMY_TIERS)) {
        cumulativeProbability += data.probability;
        if (tierRoll < cumulativeProbability) {
            tier = t;
            break;
        }
    }
    const tierData = ENEMY_TIERS[tier];
    
    // Map tiers to specific zones, ensuring legendary and mythic are in the rightmost areas
    const tierZones = {
        common: 0,
        uncommon: 1,
        rare: 2,
        epic: 3,
        legendary: 4,
        mythic: 5
    };
    
    const pos = getRandomPositionInZone(tierZones[tier]);
    
    return {
        id: Math.random().toString(36).substr(2, 9),
        type: Math.random() < 0.5 ? 'octopus' : 'fish',
        tier,
        x: pos.x,
        y: pos.y,
        angle: Math.random() * Math.PI * 2,
        health: tierData.health,
        speed: tierData.speed,
        damage: tierData.damage,
        knockbackX: 0,
        knockbackY: 0
    };
}

function createObstacle() {
    const zoneIndex = Math.floor(Math.random() * 6);
    const pos = getRandomPositionInZone(zoneIndex);
    const isEnemy = Math.random() < ENEMY_CORAL_PROBABILITY;
    return {
        id: Math.random().toString(36).substr(2, 9),
        x: pos.x,
        y: pos.y,
        width: 50 + Math.random() * 50,
        height: 50 + Math.random() * 50,
        type: 'coral',
        isEnemy,
        health: isEnemy ? ENEMY_CORAL_HEALTH : undefined
    };
}

function createItem() {
    const zoneIndex = Math.floor(Math.random() * 6);
    const pos = getRandomPositionInZone(zoneIndex);
    
    // Determine rarity based on zone
    let rarity;
    switch(zoneIndex) {
        case 0:
            rarity = 'common';
            break;
        case 1:
            rarity = Math.random() < 0.7 ? 'common' : 'uncommon';
            break;
        case 2:
            rarity = Math.random() < 0.6 ? 'uncommon' : 'rare';
            break;
        case 3:
            rarity = Math.random() < 0.6 ? 'rare' : 'epic';
            break;
        case 4:
            rarity = Math.random() < 0.7 ? 'epic' : 'legendary';
            break;
        case 5:
            rarity = Math.random() < 0.8 ? 'legendary' : 'mythic';
            break;
        default:
            rarity = 'common';
    }

    return {
        id: Math.random().toString(36).substr(2, 9),
        type: ['health_potion', 'speed_boost', 'shield'][Math.floor(Math.random() * 3)],
        x: pos.x,
        y: pos.y,
        rarity
    };
}

function initializeGame(messageData) {
    console.log('Initializing game state in worker');
    
    // Extract saved progress data with defaults
    const savedProgress = messageData.savedProgress || {};
    const level = parseInt(savedProgress.level) || 1;
    const xp = parseInt(savedProgress.xp) || 0;
    
    // Calculate stats based on level
    const maxHealth = PLAYER_MAX_HEALTH + (HEALTH_PER_LEVEL * (level - 1));
    const damage = PLAYER_DAMAGE + (DAMAGE_PER_LEVEL * (level - 1));
    const xpToNextLevel = calculateXPRequirement(level);

    // Start player in the first zone (common)
    players[socket.id] = {
        id: socket.id,
        x: WORLD_WIDTH / 12,  // Center of first zone
        y: WORLD_HEIGHT / 2,
        angle: 0,
        score: 0,
        velocityX: 0,
        velocityY: 0,
        health: maxHealth,  // Start with full health
        inventory: [],
        isInvulnerable: true,
        level: level,
        xp: xp,
        xpToNextLevel: xpToNextLevel,
        maxHealth: maxHealth,
        damage: damage,
        lastDamageTaken: 0,
        isRegenerating: false,
        loadout: Array(10).fill(null),  // Initialize with 10 null slots
    };

    console.log('Initialized player with stats:', {
        level,
        xp,
        maxHealth,
        damage,
        xpToNextLevel
    });

    // Ensure specific number of legendary and mythic enemies
    const legendaryCount = Math.floor(ENEMY_COUNT * 0.04);  // 4% of total
    const mythicCount = Math.floor(ENEMY_COUNT * 0.01);     // 1% of total
    
    // Spawn legendary enemies
    for (let i = 0; i < legendaryCount; i++) {
        const enemy = createEnemy();
        enemy.tier = 'legendary';
        const pos = getRandomPositionInZone(4);  // Zone 4 for legendary
        enemy.x = pos.x;
        enemy.y = pos.y;
        enemies.push(enemy);
    }
    
    // Spawn mythic enemies
    for (let i = 0; i < mythicCount; i++) {
        const enemy = createEnemy();
        enemy.tier = 'mythic';
        const pos = getRandomPositionInZone(5);  // Zone 5 for mythic
        enemy.x = pos.x;
        enemy.y = pos.y;
        enemies.push(enemy);
    }
    
    // Spawn remaining enemies
    const remainingCount = ENEMY_COUNT - legendaryCount - mythicCount;
    for (let i = 0; i < remainingCount; i++) {
        enemies.push(createEnemy());
    }

    for (let i = 0; i < OBSTACLE_COUNT; i++) {
        obstacles.push(createObstacle());
    }

    for (let i = 0; i < ITEM_COUNT; i++) {
        items.push(createItem());
    }

    for (let i = 0; i < DECORATION_COUNT; i++) {
        decorations.push(createDecoration());
    }

    // Emit initial state
    socket.emit('currentPlayers', players);
    socket.emit('enemiesUpdate', enemies);
    socket.emit('obstaclesUpdate', obstacles);
    socket.emit('itemsUpdate', items);
    socket.emit('decorationsUpdate', decorations);
    socket.emit('playerMoved', players[socket.id]);
}

// Add the XP requirement calculation function if it's missing
function calculateXPRequirement(level) {
    return Math.floor(BASE_XP_REQUIREMENT * Math.pow(XP_MULTIPLIER, level - 1));
}

// Mock Socket class implementation
class MockSocket {
    constructor() {
        this.eventHandlers = new Map();
        this.id = 'player1';
    }
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)?.push(handler);
    }
    emit(event, data) {
        self.postMessage({
            type: 'socketEvent',
            event,
            data
        });
    }
    getId() {
        return this.id;
    }
}

const socket = new MockSocket();

// Message handler
self.onmessage = function(event) {
    const { type, event: socketEvent, data } = event.data;
    
    switch (type) {
        case 'init':
            initializeGame(event.data);
            break;
        case 'socketEvent':
            switch (socketEvent) {
case 'playerMovement':
    const currentPlayer = players[socket.id];
    if (currentPlayer) {
        let newX = data.x;
        let newY = data.y;

        // Apply knockback to player position if it exists
        if (currentPlayer.knockbackX) {
            currentPlayer.knockbackX *= KNOCKBACK_RECOVERY_SPEED;
            newX += currentPlayer.knockbackX;
            if (Math.abs(currentPlayer.knockbackX) < 0.1) currentPlayer.knockbackX = 0;
        }
        if (currentPlayer.knockbackY) {
            currentPlayer.knockbackY *= KNOCKBACK_RECOVERY_SPEED;
            newY += currentPlayer.knockbackY;
            if (Math.abs(currentPlayer.knockbackY) < 0.1) currentPlayer.knockbackY = 0;
        }

        // Check for item collisions
        const ITEM_PICKUP_RADIUS = 40;  // Radius for item pickup
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            const dx = newX - item.x;
            const dy = newY - item.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < ITEM_PICKUP_RADIUS && currentPlayer.inventory.length < MAX_INVENTORY_SIZE) {
                // Add item to player's inventory
                currentPlayer.inventory.push(item);
                
                // Remove item from world
                items.splice(i, 1);
                
                // Create new item to maintain item count
                items.push(createItem());
                
                // Notify clients
                socket.emit('inventoryUpdate', currentPlayer.inventory);
                socket.emit('itemCollected', { 
                    playerId: socket.id, 
                    itemId: item.id 
                });
                socket.emit('itemsUpdate', items);
            }
        }

        // Rest of the existing collision checks...
        let collision = false;

        // Check collision with enemies first
        for (const enemy of enemies) {
            const enemySize = ENEMY_SIZE * ENEMY_SIZE_MULTIPLIERS[enemy.tier];
            
            if (
                newX < enemy.x + enemySize &&
                newX + PLAYER_SIZE > enemy.x &&
                newY < enemy.y + enemySize &&
                newY + PLAYER_SIZE > enemy.y
            ) {
                collision = true;
                console.log(enemy);
                if (true) {
                    // Enemy damages player
                    currentPlayer.health -= enemy.damage;
                    socket.emit('playerDamaged', { playerId: currentPlayer.id, health: currentPlayer.health });

                    // Player damages enemy
                    enemy.health -= currentPlayer.damage;
                    socket.emit('enemyDamaged', { enemyId: enemy.id, health: enemy.health });

                    // Calculate knockback direction
                    const dx = enemy.x - newX;
                    const dy = enemy.y - newY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const normalizedDx = dx / distance;
                    const normalizedDy = dy / distance;

                    // Apply knockback to player's position immediately
                    newX -= normalizedDx * KNOCKBACK_FORCE;
                    newY -= normalizedDy * KNOCKBACK_FORCE;
                    
                    // Store knockback for gradual recovery
                    currentPlayer.knockbackX = -normalizedDx * KNOCKBACK_FORCE;
                    currentPlayer.knockbackY = -normalizedDy * KNOCKBACK_FORCE;

                    // Check if enemy dies
                    if (enemy.health <= 0) {
                        const index = enemies.findIndex(e => e.id === enemy.id);
                        if (index !== -1) {
                            // Award XP before removing the enemy
                            const xpGained = getXPFromEnemy(enemy);
                            addXPToPlayer(currentPlayer, xpGained);
                            
                            // Check for item drop and add directly to inventory
                            const dropChance = DROP_CHANCES[enemy.tier];
                            if (Math.random() < dropChance && currentPlayer.inventory.length < MAX_INVENTORY_SIZE) {
                                // Create item and add directly to player's inventory
                                const newItem = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    type: ['health_potion', 'speed_boost', 'shield'][Math.floor(Math.random() * 3)],
                                    x: enemy.x,
                                    y: enemy.y
                                };
                                currentPlayer.inventory.push(newItem);
                                
                                // Notify about item pickup
                                socket.emit('inventoryUpdate', currentPlayer.inventory);
                                socket.emit('itemCollected', { 
                                    playerId: currentPlayer.id, 
                                    itemId: newItem.id,
                                    itemType: newItem.type 
                                });
                            }
                            
                            // Remove the dead enemy and create a new one
                            enemies.splice(index, 1);
                            socket.emit('enemyDestroyed', enemy.id);
                            enemies.push(createEnemy());
                        }
                    }

                    // Check if player dies
                    if (currentPlayer.health <= 0) {
                        respawnPlayer(currentPlayer);
                        socket.emit('playerDied', currentPlayer.id);
                        socket.emit('playerRespawned', currentPlayer);
                        return;
                    }
                }
                break;
            }
        }

        // Check collision with obstacles
        for (const obstacle of obstacles) {
            if (
                newX + PLAYER_SIZE > obstacle.x && 
                newX < obstacle.x + obstacle.width &&
                newY + PLAYER_SIZE > obstacle.y &&
                newY < obstacle.y + obstacle.height
            ) {
                collision = true;
                if (obstacle.isEnemy) {
                    currentPlayer.health -= ENEMY_CORAL_DAMAGE;
                    socket.emit('playerDamaged', { playerId: currentPlayer.id, health: currentPlayer.health });

                    if (currentPlayer.health <= 0) {
                        respawnPlayer(currentPlayer);
                        socket.emit('playerDied', currentPlayer.id);
                        socket.emit('playerRespawned', currentPlayer);
                        return; // Exit early if player dies
                    }
                }
                break;
            }
        }

        // Update player position even if there was a collision (to apply knockback)
        currentPlayer.x = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_SIZE, newX));
        currentPlayer.y = Math.max(0, Math.min(WORLD_HEIGHT - PLAYER_SIZE, newY));
        currentPlayer.angle = data.angle;
        currentPlayer.velocityX = data.velocityX;
        currentPlayer.velocityY = data.velocityY;

        // Always emit the updated position
        socket.emit('playerMoved', currentPlayer);
        if (currentPlayer.health < currentPlayer.maxHealth) {
            currentPlayer.health += 0.1;
        }
    }
    break;

    case 'collectItem':
        var itemIndex = items.findIndex(function (Item) { return Item.id === data.ItemId; });
        if (itemIndex !== -1 && players[socket.id].inventory.length < MAX_INVENTORY_SIZE) {
            var Item = items[itemIndex];
            players[socket.id].inventory.push(Item);
            items.splice(itemIndex, 1);
            items.push(createItem());
            socket.emit('itemCollected', { playerId: socket.id, itemId: data.itemId });
        }
        break;
    case 'useItem':
        const playerUsingItem = players[socket.id];
        const loadoutSlot = playerUsingItem.loadout.findIndex(item => item?.id === data.itemId);
        if (loadoutSlot === -1) return;  // Item not found in loadout

        const item = playerUsingItem.loadout[loadoutSlot];
        if (!item || item.onCooldown) return;

        const rarityMultipliers = {
            common: 1,
            uncommon: 1.5,
            rare: 2,
            epic: 2.5,
            legendary: 3,
            mythic: 4
        };

        const multiplier = item.rarity ? rarityMultipliers[item.rarity] : 1;

        switch (item.type) {
            case 'health_potion':
                playerUsingItem.health = Math.min(playerUsingItem.maxHealth, playerUsingItem.health + (50 * multiplier));
                break;
            case 'speed_boost':
                playerUsingItem.speed_boost = true;
                socket.emit('speedBoostActive', socket.id);
                setTimeout(() => {
                    if (players[socket.id]) {
                        players[socket.id].speed_boost = false;
                    }
                }, 5000 * multiplier);
                break;
            case 'shield':
                playerUsingItem.isInvulnerable = true;
                setTimeout(() => {
                    if (players[socket.id]) {
                        players[socket.id].isInvulnerable = false;
                    }
                }, 3000 * multiplier);
                break;
        }

        // Add cooldown
        item.onCooldown = true;
        setTimeout(() => {
            if (playerUsingItem.loadout[loadoutSlot] === item) {
                item.onCooldown = false;
                socket.emit('itemCooldownComplete', { 
                    playerId: socket.id, 
                    itemId: item.id 
                });
            }
        }, 10000 * (1 / multiplier));  // 10 second base cooldown, reduced by rarity

        socket.emit('itemUsed', { 
            playerId: socket.id, 
            itemId: item.id,
            type: item.type,
            rarity: item.rarity
        });
        break;
    case 'requestRespawn':
        var deadPlayer = players[socket.id];
        if (deadPlayer) {
            respawnPlayer(deadPlayer);
        }
        break;
    case 'updateLoadout':
        var player = players[socket.id];
        if (player) {
            player.loadout = data.loadout;
            player.inventory = data.inventory;
            socket.emit('playerUpdated', player);
        }
        break;
    // ... (handle other socket events)
    }
    break;
    }
    };

    // Start enemy movement interval
    setInterval(() => {
    try {
    moveEnemies();
    } catch (error) {
    console.error('Error in moveEnemies interval:', error);
    }
    }, 100);

// Update the item effects based on rarity
function applyItemEffect(player, item) {
    const rarityMultipliers = {
        common: 1,
        uncommon: 1.5,
        rare: 2,
        epic: 2.5,
        legendary: 3,
        mythic: 4
    };

    const multiplier = rarityMultipliers[item.rarity || 'common'];

    switch (item.type) {
        case 'health_potion':
            const healAmount = 50 * multiplier;
            player.health = Math.min(player.maxHealth, player.health + healAmount);
            break;
        case 'speed_boost':
            player.speed_boost = true;
            player.speed_boost_multiplier = multiplier;
            setTimeout(() => {
                player.speed_boost = false;
                player.speed_boost_multiplier = 1;
            }, 5000 * multiplier); // Duration increases with rarity
            break;
        case 'shield':
            player.isInvulnerable = true;
            setTimeout(() => {
                player.isInvulnerable = false;
            }, 3000 * multiplier); // Duration increases with rarity
            break;
    }
}
`], { type: 'application/javascript' });

;// ./src/imageAssets.ts
// Auto-generated file - do not edit
const IMAGE_ASSETS = {
    "coral": "data:image/png;base64,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",
    "exit": "data:image/png;base64,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",
    "fish": "data:image/png;base64,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",
    "health_potion": "data:image/png;base64,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",
    "octopus": "data:image/png;base64,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",
    "palm": "data:image/png;base64,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",
    "player": "data:image/png;base64,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",
    "shield": "data:image/png;base64,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",
    "speed_boost": "data:image/png;base64,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"
};

;// ./src/signaling.ts
// SignalingClient class
class SignalingClient {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.messageHandlers = [];
        this.openHandlers = [];
        this.errorHandlers = [];
        this.clientId = `client_${Math.random().toString(36).substr(2, 9)}`;
    }
    connect() {
        try {
            console.log('[Client] Attempting to connect to:', this.serverUrl);
            this.ws = new WebSocket(this.serverUrl);
            this.ws.onopen = () => {
                console.log('[Client] WebSocket connection established');
                // Send initial connection message with client ID
                this.send({
                    type: 'connect',
                    clientId: this.clientId
                });
                this.openHandlers.forEach(handler => handler());
            };
            this.ws.onmessage = (event) => {
                try {
                    console.log('[Client] Raw message received:', event.data);
                    const message = JSON.parse(event.data);
                    console.log('[Client] Parsed message:', message);
                    this.messageHandlers.forEach(handler => handler(message));
                }
                catch (error) {
                    console.error('[Client] Error handling message:', error);
                }
            };
            this.ws.onerror = (event) => {
                console.error('[Client] WebSocket error:', event);
                const error = new Error('WebSocket error occurred');
                this.errorHandlers.forEach(handler => handler(error));
            };
            this.ws.onclose = () => {
                console.log('[Client] WebSocket connection closed');
            };
        }
        catch (error) {
            console.error('[Client] Connection error:', error);
            if (error instanceof Error) {
                this.errorHandlers.forEach(handler => handler(error));
            }
        }
    }
    send(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('[Client] Cannot send message - connection not open');
            return;
        }
        // Add client ID to all outgoing messages
        const fullMessage = Object.assign(Object.assign({}, message), { clientId: this.clientId });
        console.log('[Client] Sending message:', fullMessage);
        this.ws.send(JSON.stringify(fullMessage));
    }
    onMessage(handler) {
        this.messageHandlers.push(handler);
    }
    onOpen(handler) {
        this.openHandlers.push(handler);
    }
    onError(handler) {
        this.errorHandlers.push(handler);
    }
    close() {
        console.log('[Client] Closing connection');
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            console.log('[Client] Connection closed');
        }
        this.messageHandlers = [];
        this.openHandlers = [];
        this.errorHandlers = [];
        console.log('[Client] All handlers cleared');
    }
}
// SignalingServer class
class SignalingServer {
    constructor(port) {
        this.port = port;
        this.connections = new Map();
        this.messageHandlers = [];
        this.server = null;
        this.wsConnections = new Map();
        if (typeof self !== 'undefined' &&
            typeof Window === 'undefined' &&
            typeof WorkerGlobalScope !== 'undefined') {
            this.initializeServer();
        }
    }
    initializeServer() {
        try {
            console.log('[Server] Initializing SignalingServer on port:', this.port);
            // Create message channel for worker communication
            const channel = new MessageChannel();
            this.server = channel.port1;
            this.server.onmessage = this.handleServerMessage.bind(this);
            this.server.start();
            // Send port info to main thread
            self.postMessage({
                type: 'server_init',
                port: channel.port2,
                serverInfo: { port: this.port }
            }, [channel.port2]);
            console.log('[Server] Server initialization complete');
        }
        catch (error) {
            console.error('[Server] Server initialization failed:', error);
        }
    }
    handleClientMessage(clientId, data) {
        console.log('[Server] Handling client message:', clientId, data);
        this.messageHandlers.forEach(handler => handler({
            type: 'client_message',
            clientId,
            data
        }));
    }
    handleDisconnect(clientId) {
        console.log('[Server] Handling disconnect:', clientId);
        const connection = this.connections.get(clientId);
        if (connection) {
            connection.close();
            this.connections.delete(clientId);
            this.messageHandlers.forEach(handler => handler({
                type: 'disconnect',
                clientId
            }));
        }
    }
    handleServerMessage(event) {
        const message = event.data;
        console.log('[Server] Received message:', message);
        switch (message.type) {
            case 'connect':
                this.handleNewConnection(message.clientId);
                break;
            case 'client_message':
                this.handleClientMessage(message.clientId, message.data);
                break;
            case 'disconnect':
                this.handleDisconnect(message.clientId);
                break;
            default:
                console.log('[Server] Unknown message type:', message.type);
        }
    }
    handleNewConnection(clientId) {
        console.log('[Server] New connection:', clientId);
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
            this.handleClientMessage(clientId, event.data);
        };
        channel.port1.start();
        this.connections.set(clientId, channel.port1);
        self.postMessage({
            type: 'client_connection',
            clientId: clientId,
            port: channel.port2
        }, [channel.port2]);
        // Notify handlers about new connection
        this.messageHandlers.forEach(handler => handler({
            type: 'connect',
            clientId: clientId
        }));
    }
    sendToPeer(clientId, message) {
        // Try WebSocket connection first
        const wsConnection = this.wsConnections.get(clientId);
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
            console.log('[Server] Sending via WebSocket to client:', clientId, message);
            wsConnection.send(JSON.stringify(message));
            return;
        }
        // Fall back to MessagePort
        const mpConnection = this.connections.get(clientId);
        if (mpConnection) {
            console.log('[Server] Sending via MessagePort to client:', clientId, message);
            mpConnection.postMessage(message);
        }
        else {
            console.error('[Server] No connection found for client:', clientId);
        }
    }
    broadcast(message) {
        console.log('[Server] Broadcasting:', message);
        const messageStr = JSON.stringify(message);
        // Broadcast to WebSocket connections
        this.wsConnections.forEach((ws, clientId) => {
            try {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(messageStr);
                    console.log('[Server] Broadcast sent to WebSocket client:', clientId);
                }
            }
            catch (error) {
                console.error('[Server] WebSocket broadcast failed for client:', clientId, error);
            }
        });
        // Broadcast to MessagePort connections
        this.connections.forEach((connection, clientId) => {
            try {
                connection.postMessage(message);
                console.log('[Server] Broadcast sent to MessagePort client:', clientId);
            }
            catch (error) {
                console.error('[Server] MessagePort broadcast failed for client:', clientId, error);
            }
        });
    }
    onMessage(handler) {
        console.log('[Server] Adding message handler');
        this.messageHandlers.push(handler);
        console.log('[Server] Total handlers:', this.messageHandlers.length);
    }
    isConnected(peerId) {
        return this.connections.has(peerId);
    }
    close() {
        console.log('[Server] Closing all connections');
        this.connections.forEach(connection => connection.close());
        this.connections.clear();
        this.messageHandlers = [];
        if (this.server) {
            this.server.close();
            this.server = null;
        }
        console.log('[Server] Server closed');
    }
}

;// ./src/game.ts
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};




class Game {
    constructor(isSinglePlayer = false) {
        var _a, _b;
        this.speedBoostActive = false;
        this.shieldActive = false;
        this.players = new Map();
        this.playerSprite = new Image();
        this.dots = [];
        this.DOT_SIZE = 5;
        this.DOT_COUNT = 20;
        // Reduce these values for even slower movement
        this.PLAYER_ACCELERATION = 0.2; // Reduced from 0.5 to 0.2
        this.MAX_SPEED = 4; // Reduced from 8 to 4
        this.FRICTION = 0.92; // Increased friction from 0.95 to 0.92 for even quicker deceleration
        this.cameraX = 0;
        this.cameraY = 0;
        this.WORLD_WIDTH = 10000; // Increased from 2000 to 10000
        this.WORLD_HEIGHT = 2000; // Keep height the same
        this.keysPressed = new Set();
        this.enemies = new Map();
        this.octopusSprite = new Image();
        this.fishSprite = new Image();
        this.coralSprite = new Image();
        this.palmSprite = new Image();
        this.PLAYER_MAX_HEALTH = 100;
        this.ENEMY_MAX_HEALTH = {
            common: 20,
            uncommon: 40,
            rare: 60,
            epic: 80,
            legendary: 100,
            mythic: 150
        };
        this.PLAYER_DAMAGE = 10;
        this.ENEMY_DAMAGE = 5;
        this.DAMAGE_COOLDOWN = 1000; // 1 second cooldown
        this.lastDamageTime = 0;
        this.ENEMY_COLORS = {
            common: '#808080',
            uncommon: '#008000',
            rare: '#0000FF',
            epic: '#800080',
            legendary: '#FFA500',
            mythic: '#FF0000'
        };
        this.obstacles = [];
        this.ENEMY_CORAL_MAX_HEALTH = 50;
        this.items = [];
        this.itemSprites = {};
        this.isInventoryOpen = false;
        this.isSinglePlayer = false;
        this.worker = null;
        this.gameLoopId = null;
        this.socketHandlers = new Map();
        this.BASE_XP_REQUIREMENT = 100;
        this.XP_MULTIPLIER = 1.5;
        this.MAX_LEVEL = 50;
        this.HEALTH_PER_LEVEL = 10;
        this.DAMAGE_PER_LEVEL = 2;
        // Add this property to store floating texts
        this.floatingTexts = [];
        // Add enemy size multipliers as a class property
        this.ENEMY_SIZE_MULTIPLIERS = {
            common: 1.0,
            uncommon: 1.2,
            rare: 1.4,
            epic: 1.6,
            legendary: 1.8,
            mythic: 2.0
        };
        // Add property to track if player is dead
        this.isPlayerDead = false;
        // Add minimap properties
        this.MINIMAP_WIDTH = 200;
        this.MINIMAP_HEIGHT = 40;
        this.MINIMAP_PADDING = 10;
        // Add decoration-related properties
        this.decorations = [];
        // Add sand property
        this.sands = [];
        // Add control mode property
        this.useMouseControls = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.showHitboxes = true; // Set to true to show hitboxes
        this.playerHue = 0;
        this.playerColor = 'hsl(0, 100%, 50%)';
        this.LOADOUT_SLOTS = 10;
        this.LOADOUT_KEY_BINDINGS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
        // Add to class properties
        this.inventoryPanel = null;
        this.saveIndicator = null;
        this.saveIndicatorTimeout = null;
        // Add to class properties
        this.chatContainer = null;
        this.chatInput = null;
        this.chatMessages = null;
        this.isChatFocused = false;
        // Add to Game class properties
        this.pendingScripts = new Map();
        // Add to Game class properties
        this.ITEM_RARITY_COLORS = {
            common: '#808080', // Gray
            uncommon: '#008000', // Green
            rare: '#0000FF', // Blue
            epic: '#800080', // Purple
            legendary: '#FFA500', // Orange
            mythic: '#FF0000' // Red
        };
        // Add to Game class properties
        this.craftingPanel = null;
        this.craftingSlots = Array(4).fill(null).map((_, i) => ({ index: i, item: null }));
        this.isCraftingOpen = false;
        // Add to class properties at the top
        this.connectionModal = null;
        this.signalingClient = null;
        this.isWebRTCMode = false;
        //console.log('Game constructor called');
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        // Set initial canvas size
        this.resizeCanvas();
        // Add resize listener
        window.addEventListener('resize', () => this.resizeCanvas());
        this.isSinglePlayer = isSinglePlayer;
        // Initialize sprites but don't start game loop
        Promise.all([
            this.initializeSprites(),
            this.setupItemSprites()
        ]).then(() => {
            console.log('All sprites loaded successfully');
            this.updateColorPreview();
            // Remove gameLoop() call from here
        }).catch(console.error);
        // Create and set up preview canvas
        this.colorPreviewCanvas = document.createElement('canvas');
        this.colorPreviewCanvas.width = 64; // Set fixed size for preview
        this.colorPreviewCanvas.height = 64;
        this.colorPreviewCanvas.style.width = '64px';
        this.colorPreviewCanvas.style.height = '64px';
        this.colorPreviewCanvas.style.imageRendering = 'pixelated';
        // Add preview canvas to the color picker
        const previewContainer = document.createElement('div');
        previewContainer.style.display = 'flex';
        previewContainer.style.justifyContent = 'center';
        previewContainer.style.marginTop = '10px';
        previewContainer.appendChild(this.colorPreviewCanvas);
        (_a = document.querySelector('.color-picker')) === null || _a === void 0 ? void 0 : _a.appendChild(previewContainer);
        // Set up color picker functionality
        const hueSlider = document.getElementById('hueSlider');
        const colorPreview = document.getElementById('colorPreview');
        if (hueSlider && colorPreview) {
            // Load saved hue from localStorage
            const savedHue = localStorage.getItem('playerHue');
            if (savedHue !== null) {
                this.playerHue = parseInt(savedHue);
                hueSlider.value = savedHue;
                this.playerColor = `hsl(${this.playerHue}, 100%, 50%)`;
                colorPreview.style.backgroundColor = this.playerColor;
                this.updateColorPreview();
            }
            // Preview color while sliding without saving
            hueSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                colorPreview.style.backgroundColor = `hsl(${value}, 100%, 50%)`;
            });
            // Add update color button handler
            const updateColorButton = document.getElementById('updateColorButton');
            if (updateColorButton) {
                console.log('Update color button found');
                updateColorButton.addEventListener('click', () => {
                    const value = hueSlider.value;
                    localStorage.setItem('playerHue', value);
                    console.log('Player hue saved:', value);
                    // Update game state after saving
                    this.playerHue = parseInt(value);
                    this.playerColor = `hsl(${this.playerHue}, 100%, 50%)`;
                    if (this.playerSprite.complete) {
                        this.updateColorPreview();
                    }
                    // Show confirmation message
                    this.showFloatingText(this.canvas.width / 2, 50, 'Color Updated!', '#4CAF50', 20);
                });
            }
        }
        this.setupEventListeners();
        // Get title screen elements
        this.titleScreen = document.querySelector('.center_text');
        this.nameInput = document.getElementById('nameInput');
        // Initialize game mode after resource loading
        if (this.isSinglePlayer) {
            this.initSinglePlayerMode();
            this.hideTitleScreen();
        }
        else {
            this.initMultiPlayerMode();
        }
        // Move authentication to after socket initialization
        this.authenticate();
        // Add respawn button listener
        const respawnButton = document.getElementById('respawnButton');
        respawnButton === null || respawnButton === void 0 ? void 0 : respawnButton.addEventListener('click', () => {
            if (this.isPlayerDead) {
                this.socket.emit('requestRespawn');
            }
        });
        // Add mouse move listener
        this.canvas.addEventListener('mousemove', (event) => {
            if (this.useMouseControls) {
                const rect = this.canvas.getBoundingClientRect();
                this.mouseX = event.clientX - rect.left + this.cameraX;
                this.mouseY = event.clientY - rect.top + this.cameraY;
            }
        });
        // Initialize exit button
        this.exitButton = document.getElementById('exitButton');
        this.exitButtonContainer = document.getElementById('exitButtonContainer');
        // Add exit button click handler
        (_b = this.exitButton) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => this.handleExit());
        // Create loadout bar HTML element
        const loadoutBar = document.createElement('div');
        loadoutBar.id = 'loadoutBar';
        loadoutBar.style.position = 'fixed';
        loadoutBar.style.bottom = '20px';
        loadoutBar.style.left = '50%';
        loadoutBar.style.transform = 'translateX(-50%)';
        loadoutBar.style.display = 'flex';
        loadoutBar.style.gap = '5px';
        loadoutBar.style.zIndex = '1000';
        // Create slots
        for (let i = 0; i < this.LOADOUT_SLOTS; i++) {
            const slot = document.createElement('div');
            slot.className = 'loadout-slot';
            slot.dataset.slot = i.toString();
            slot.style.width = '50px';
            slot.style.height = '50px';
            slot.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            slot.style.border = '2px solid #666';
            slot.style.borderRadius = '5px';
            loadoutBar.appendChild(slot);
        }
        document.body.appendChild(loadoutBar);
        // Set up item sprites
        this.setupItemSprites();
        // Add drag-and-drop event listeners
        this.setupDragAndDrop();
        // Create inventory panel
        this.inventoryPanel = document.createElement('div');
        this.inventoryPanel.id = 'inventoryPanel';
        this.inventoryPanel.className = 'inventory-panel';
        this.inventoryPanel.style.display = 'none';
        // Create inventory content
        const inventoryContent = document.createElement('div');
        inventoryContent.className = 'inventory-content';
        this.inventoryPanel.appendChild(inventoryContent);
        document.body.appendChild(this.inventoryPanel);
        // Create save indicator
        this.saveIndicator = document.createElement('div');
        this.saveIndicator.className = 'save-indicator';
        this.saveIndicator.textContent = 'Progress Saved';
        this.saveIndicator.style.display = 'none';
        document.body.appendChild(this.saveIndicator);
        if (!isSinglePlayer) {
            this.initializeChat();
        }
        // Add this to the constructor after creating the loadout bar
        const style = document.createElement('style');
        style.textContent = `
          .loadout-slot.on-cooldown {
              position: relative;
              overflow: hidden;
          }
          .loadout-slot.on-cooldown::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0, 0, 0, 0.5);
              animation: cooldown 10s linear;
          }
          @keyframes cooldown {
              from { height: 100%; }
              to { height: 0%; }
          }
      `;
        document.head.appendChild(style);
        // Add to constructor after other UI initialization
        this.initializeCrafting();
        // Load saved server IP
        this.loadServerIP();
    }
    initializeSprites() {
        return __awaiter(this, void 0, void 0, function* () {
            const loadSprite = (sprite, filename) => __awaiter(this, void 0, void 0, function* () {
                try {
                    sprite.crossOrigin = "anonymous";
                    sprite.src = yield this.getAssetUrl(filename);
                    return new Promise((resolve, reject) => {
                        sprite.onload = () => resolve();
                        sprite.onerror = (e) => {
                            console.error(`Failed to load sprite: ${filename}`, e);
                            reject(e);
                        };
                    });
                }
                catch (error) {
                    console.error(`Error loading sprite ${filename}:`, error);
                    // Don't throw error, just log it and continue
                }
            });
            try {
                yield Promise.allSettled([
                    loadSprite(this.playerSprite, 'player.png'),
                    loadSprite(this.octopusSprite, 'octopus.png'),
                    loadSprite(this.fishSprite, 'fish.png'),
                    loadSprite(this.coralSprite, 'coral.png'),
                    loadSprite(this.palmSprite, 'palm.png')
                ]);
            }
            catch (error) {
                console.error('Error loading sprites:', error);
                // Continue even if some sprites fail to load
            }
        });
    }
    authenticate() {
        var _a;
        if (!this.socket) {
            console.error('Cannot authenticate: Socket not initialized');
            return;
        }
        // Save server IP when authenticating
        this.saveServerIP();
        // Get credentials from AuthUI or localStorage
        const credentials = {
            username: localStorage.getItem('username') || 'player1',
            password: localStorage.getItem('password') || 'password123',
            playerName: ((_a = this.nameInput) === null || _a === void 0 ? void 0 : _a.value) || 'Anonymous'
        };
        this.socket.emit('authenticate', credentials);
        this.socket.on('authenticated', (response) => {
            if (response.success) {
                console.log('Authentication successful');
                if (response.player) {
                    if (this.socket.id) {
                        // Update player data with saved progress
                        const player = this.players.get(this.socket.id);
                        if (player) {
                            Object.assign(player, response.player);
                        }
                    }
                }
            }
            else {
                console.error('Authentication failed:', response.error);
                alert('Authentication failed: ' + response.error);
                localStorage.removeItem('currentUser');
                window.location.reload();
            }
        });
    }
    initSinglePlayerMode() {
        console.log('Initializing single player mode');
        try {
            // Create worker from blob
            this.worker = new Worker(URL.createObjectURL(workerBlob));
            // Load saved progress
            const savedProgress = this.loadPlayerProgress();
            console.log('Loaded saved progress:', savedProgress);
            // Create mock socket
            const mockSocket = {
                id: 'player1',
                emit: (event, data) => {
                    var _a;
                    console.log('Emitting event:', event, data);
                    (_a = this.worker) === null || _a === void 0 ? void 0 : _a.postMessage({
                        type: 'socketEvent',
                        event,
                        data
                    });
                },
                on: (event, handler) => {
                    console.log('Registering handler for event:', event);
                    this.socketHandlers.set(event, handler);
                },
                disconnect: () => {
                    var _a;
                    (_a = this.worker) === null || _a === void 0 ? void 0 : _a.terminate();
                }
            };
            // Use mock socket
            this.socket = mockSocket;
            // Set up socket listeners
            this.setupSocketListeners();
            // Handle worker messages
            this.worker.onmessage = (event) => {
                const { type, event: socketEvent, data } = event.data;
                if (type === 'socketEvent') {
                    const handler = this.socketHandlers.get(socketEvent);
                    if (handler) {
                        handler(data);
                    }
                }
            };
            // Initialize worker
            this.worker.postMessage({
                type: 'init',
                savedProgress: {
                    level: savedProgress['level'],
                    xp: savedProgress['xp'],
                    maxHealth: savedProgress['maxHealth'],
                    damage: savedProgress['damage']
                }
            });
            // Initialize game
            this.initializeGame();
        }
        catch (error) {
            console.error('Error initializing worker:', error);
        }
    }
    initMultiPlayerMode() {
        this.showConnectionModal();
    }
    setupSocketListeners() {
        this.socket.on('connect', () => {
            //console.log('Connected to server with ID:', this.socket.id);
        });
        this.socket.on('currentPlayers', (players) => {
            //console.log('Received current players:', players);
            this.players.clear();
            Object.values(players).forEach(player => {
                this.players.set(player.id, Object.assign(Object.assign({}, player), { imageLoaded: true, score: 0, velocityX: 0, velocityY: 0, health: this.PLAYER_MAX_HEALTH }));
            });
        });
        this.socket.on('newPlayer', (player) => {
            //console.log('New player joined:', player);
            this.players.set(player.id, Object.assign(Object.assign({}, player), { imageLoaded: true, score: 0, velocityX: 0, velocityY: 0, health: this.PLAYER_MAX_HEALTH }));
        });
        this.socket.on('playerMoved', (player) => {
            //console.log('Player moved:', player);
            const existingPlayer = this.players.get(player.id);
            if (existingPlayer) {
                Object.assign(existingPlayer, player);
            }
            else {
                this.players.set(player.id, Object.assign(Object.assign({}, player), { imageLoaded: true, score: 0, velocityX: 0, velocityY: 0, health: this.PLAYER_MAX_HEALTH }));
            }
        });
        this.socket.on('playerDisconnected', (playerId) => {
            //console.log('Player disconnected:', playerId);
            this.players.delete(playerId);
        });
        this.socket.on('dotCollected', (data) => {
            const player = this.players.get(data.playerId);
            if (player) {
                player.score++;
            }
            this.dots.splice(data.dotIndex, 1);
            this.generateDot();
        });
        this.socket.on('enemiesUpdate', (enemies) => {
            this.enemies.clear();
            enemies.forEach(enemy => this.enemies.set(enemy.id, enemy));
        });
        this.socket.on('enemyMoved', (enemy) => {
            this.enemies.set(enemy.id, enemy);
        });
        this.socket.on('playerDamaged', (data) => {
            const player = this.players.get(data.playerId);
            if (player) {
                player.health = data.health;
            }
        });
        this.socket.on('enemyDamaged', (data) => {
            const enemy = this.enemies.get(data.enemyId);
            if (enemy) {
                enemy.health = data.health;
            }
        });
        this.socket.on('enemyDestroyed', (enemyId) => {
            this.enemies.delete(enemyId);
        });
        this.socket.on('obstaclesUpdate', (obstacles) => {
            this.obstacles = obstacles;
        });
        this.socket.on('obstacleDamaged', (data) => {
            const obstacle = this.obstacles.find(o => o.id === data.obstacleId);
            if (obstacle && obstacle.isEnemy) {
                obstacle.health = data.health;
            }
        });
        this.socket.on('obstacleDestroyed', (obstacleId) => {
            const index = this.obstacles.findIndex(o => o.id === obstacleId);
            if (index !== -1) {
                this.obstacles.splice(index, 1);
            }
        });
        this.socket.on('itemsUpdate', (items) => {
            this.items = items;
        });
        this.socket.on('itemCollected', (data) => {
            const player = this.players.get(data.playerId);
            if (player) {
                this.items = this.items.filter(item => item.id !== data.itemId);
                if (data.playerId === this.socket.id) {
                    // Update inventory display if it's open
                    if (this.isInventoryOpen) {
                        this.updateInventoryDisplay();
                    }
                }
            }
        });
        this.socket.on('inventoryUpdate', (inventory) => {
            var _a;
            const player = this.players.get(((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id) || '');
            if (player) {
                player.inventory = inventory;
                // Update inventory display if it's open
                if (this.isInventoryOpen) {
                    this.updateInventoryDisplay();
                }
            }
        });
        this.socket.on('xpGained', (data) => {
            //console.log('XP gained:', data);  // Add logging
            const player = this.players.get(data.playerId);
            if (player) {
                player.xp = data.totalXp;
                player.level = data.level;
                player.xpToNextLevel = data.xpToNextLevel;
                player.maxHealth = data.maxHealth;
                player.damage = data.damage;
                this.showFloatingText(player.x, player.y - 20, '+' + data.xp + ' XP', '#32CD32', 16);
                this.savePlayerProgress(player);
            }
        });
        this.socket.on('levelUp', (data) => {
            //console.log('Level up:', data);  // Add logging
            const player = this.players.get(data.playerId);
            if (player) {
                player.level = data.level;
                player.maxHealth = data.maxHealth;
                player.damage = data.damage;
                this.showFloatingText(player.x, player.y - 30, 'Level Up! Level ' + data.level, '#FFD700', 24);
                this.savePlayerProgress(player);
            }
        });
        this.socket.on('playerLostLevel', (data) => {
            //console.log('Player lost level:', data);
            const player = this.players.get(data.playerId);
            if (player) {
                player.level = data.level;
                player.maxHealth = data.maxHealth;
                player.damage = data.damage;
                player.xp = data.xp;
                player.xpToNextLevel = data.xpToNextLevel;
                // Show level loss message
                this.showFloatingText(player.x, player.y - 30, 'Level Lost! Level ' + data.level, '#FF0000', 24);
                // Save the new progress
                this.savePlayerProgress(player);
            }
        });
        this.socket.on('playerRespawned', (player) => {
            const existingPlayer = this.players.get(player.id);
            if (existingPlayer) {
                Object.assign(existingPlayer, player);
                if (player.id === this.socket.id) {
                    this.isPlayerDead = false;
                    this.hideDeathScreen();
                }
                // Show respawn message
                this.showFloatingText(player.x, player.y - 50, 'Respawned!', '#FFFFFF', 20);
            }
        });
        this.socket.on('playerDied', (playerId) => {
            if (playerId === this.socket.id) {
                this.isPlayerDead = true;
                this.showDeathScreen();
            }
        });
        this.socket.on('decorationsUpdate', (decorations) => {
            this.decorations = decorations;
        });
        this.socket.on('sandsUpdate', (sands) => {
            this.sands = sands;
        });
        this.socket.on('playerUpdated', (updatedPlayer) => {
            var _a;
            const player = this.players.get(updatedPlayer.id);
            if (player) {
                Object.assign(player, updatedPlayer);
                // Update displays if this is the current player
                if (updatedPlayer.id === ((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id)) {
                    if (this.isInventoryOpen) {
                        this.updateInventoryDisplay();
                    }
                    this.updateLoadoutDisplay(); // Always update loadout display
                }
            }
        });
        this.socket.on('speedBoostActive', (playerId) => {
            console.log('Speed boost active:', playerId);
            if (playerId === this.socket.id) {
                this.speedBoostActive = true;
                console.log('Speed boost active for client');
            }
        });
        this.socket.on('savePlayerProgress', () => {
            this.showSaveIndicator();
        });
        this.socket.on('chatMessage', (message) => {
            this.addChatMessage(message);
        });
        this.socket.on('chatHistory', (history) => {
            history.forEach(message => this.addChatMessage(message));
        });
        this.socket.on('craftingSuccess', (data) => {
            var _a;
            const player = this.players.get(((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id) || '');
            if (player) {
                player.inventory = data.inventory;
                this.showFloatingText(this.canvas.width / 2, 50, `Successfully crafted ${data.newItem.rarity} ${data.newItem.type}!`, this.ITEM_RARITY_COLORS[data.newItem.rarity || 'common'], 24);
                this.updateInventoryDisplay();
            }
        });
        this.socket.on('craftingFailed', (message) => {
            var _a;
            this.showFloatingText(this.canvas.width / 2, 50, message, '#FF0000', 20);
            // Return items to inventory
            const player = this.players.get(((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id) || '');
            if (player) {
                this.craftingSlots.forEach(slot => {
                    if (slot.item) {
                        player.inventory.push(slot.item);
                    }
                });
                this.craftingSlots.forEach(slot => slot.item = null);
                this.updateCraftingDisplay();
                this.updateInventoryDisplay();
            }
        });
    }
    setupEventListeners() {
        var _a;
        document.addEventListener('keydown', (event) => {
            var _a, _b;
            // Skip keyboard controls if chat is focused
            if (this.isChatFocused) {
                if (event.key === 'Escape') {
                    (_a = this.chatInput) === null || _a === void 0 ? void 0 : _a.blur();
                }
                return;
            }
            // Add chat toggle
            if (event.key === 'Enter' && !this.isSinglePlayer) {
                (_b = this.chatInput) === null || _b === void 0 ? void 0 : _b.focus();
                return;
            }
            if (event.key === 'i' || event.key === 'I') {
                this.toggleInventory();
                return;
            }
            // Add control toggle with 'C' key
            if (event.key === 'c' || event.key === 'C') {
                this.useMouseControls = !this.useMouseControls;
                this.showFloatingText(this.canvas.width / 2, 50, `Controls: ${this.useMouseControls ? 'Mouse' : 'Keyboard'}`, '#FFFFFF', 20);
                return;
            }
            // Add crafting toggle with 'R' key
            if (event.key === 'r' || event.key === 'R') {
                this.toggleCrafting();
            }
            this.keysPressed.add(event.key);
            this.updatePlayerVelocity();
            // Handle loadout key bindings
            const key = event.key;
            const slotIndex = this.LOADOUT_KEY_BINDINGS.indexOf(key);
            if (slotIndex !== -1) {
                this.useLoadoutItem(slotIndex);
            }
        });
        document.addEventListener('keyup', (event) => {
            this.keysPressed.delete(event.key);
            this.updatePlayerVelocity();
        });
        // Add hitbox toggle with 'H' key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'h' || event.key === 'H') {
                this.showHitboxes = !this.showHitboxes;
                this.showFloatingText(this.canvas.width / 2, 50, `Hitboxes: ${this.showHitboxes ? 'ON' : 'OFF'}`, '#FFFFFF', 20);
            }
        });
        // Add name input change listener
        (_a = this.nameInput) === null || _a === void 0 ? void 0 : _a.addEventListener('change', () => {
            if (this.socket && this.nameInput) {
                this.socket.emit('updateName', this.nameInput.value);
            }
        });
        // Add drag and drop handlers for loadout
        const loadoutBar = document.getElementById('loadoutBar');
        if (loadoutBar) {
            loadoutBar.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            loadoutBar.addEventListener('drop', (e) => {
                var _a;
                e.preventDefault();
                const itemIndex = parseInt(((_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain')) || '-1');
                const slot = e.target.dataset.slot;
                if (itemIndex >= 0 && slot) {
                    this.equipItemToLoadout(itemIndex, parseInt(slot));
                }
            });
        }
    }
    updatePlayerVelocity() {
        var _a, _b;
        const player = this.isSinglePlayer ?
            this.players.get('player1') :
            this.players.get(((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id) || '');
        if (player) {
            if (this.useMouseControls) {
                // Mouse controls
                const dx = this.mouseX - player.x;
                const dy = this.mouseY - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 5) { // Add dead zone to prevent jittering
                    player.velocityX += (dx / distance) * this.PLAYER_ACCELERATION * (this.speedBoostActive ? 3 : 1);
                    player.velocityY += (dy / distance) * this.PLAYER_ACCELERATION * (this.speedBoostActive ? 3 : 1);
                    player.angle = Math.atan2(dy, dx);
                }
                else {
                    player.velocityX *= this.FRICTION;
                    player.velocityY *= this.FRICTION;
                }
            }
            else {
                // Keyboard controls (existing code)
                let dx = 0;
                let dy = 0;
                if (this.keysPressed.has('ArrowUp'))
                    dy -= 1;
                if (this.keysPressed.has('ArrowDown'))
                    dy += 1;
                if (this.keysPressed.has('ArrowLeft'))
                    dx -= 1;
                if (this.keysPressed.has('ArrowRight'))
                    dx += 1;
                if (dx !== 0 || dy !== 0) {
                    player.angle = Math.atan2(dy, dx);
                    if (dx !== 0 && dy !== 0) {
                        const length = Math.sqrt(dx * dx + dy * dy);
                        dx /= length;
                        dy /= length;
                    }
                    player.velocityX += dx * this.PLAYER_ACCELERATION * (this.speedBoostActive ? 3 : 1);
                    player.velocityY += dy * this.PLAYER_ACCELERATION * (this.speedBoostActive ? 3 : 1);
                }
                else {
                    player.velocityX *= this.FRICTION;
                    player.velocityY *= this.FRICTION;
                }
            }
            // Limit speed
            const speed = Math.sqrt(Math.pow(player.velocityX, 2) + Math.pow(player.velocityY, 2));
            if (speed > this.MAX_SPEED) {
                const ratio = this.MAX_SPEED / speed;
                player.velocityX *= ratio;
                player.velocityY *= ratio;
            }
            // Update position
            const newX = player.x + player.velocityX;
            const newY = player.y + player.velocityY;
            // Check world bounds
            player.x = Math.max(0, Math.min(this.WORLD_WIDTH, newX));
            player.y = Math.max(0, Math.min(this.WORLD_HEIGHT, newY));
            // Send update to server/worker
            if (this.isSinglePlayer) {
                (_b = this.worker) === null || _b === void 0 ? void 0 : _b.postMessage({
                    type: 'socketEvent',
                    event: 'playerMovement',
                    data: {
                        x: player.x,
                        y: player.y,
                        angle: player.angle,
                        velocityX: player.velocityX,
                        velocityY: player.velocityY
                    }
                });
            }
            else {
                this.socket.emit('playerMovement', {
                    x: player.x,
                    y: player.y,
                    angle: player.angle,
                    velocityX: player.velocityX,
                    velocityY: player.velocityY
                });
            }
        }
    }
    updateCamera(player) {
        // Center camera on player
        this.cameraX = player.x - this.canvas.width / 2;
        this.cameraY = player.y - this.canvas.height / 2;
        // Clamp camera to world bounds
        this.cameraX = Math.max(0, Math.min(this.WORLD_WIDTH - this.canvas.width, this.cameraX));
        this.cameraY = Math.max(0, Math.min(this.WORLD_HEIGHT - this.canvas.height, this.cameraY));
    }
    updatePlayerPosition(player) {
        // Calculate new position
        const newX = player.x + player.velocityX;
        const newY = player.y + player.velocityY;
        // Check collision with obstacles
        let collision = false;
        for (const obstacle of this.obstacles) {
            if (newX < obstacle.x + obstacle.width &&
                newX + 40 > obstacle.x && // Assuming player width is 40
                newY < obstacle.y + obstacle.height &&
                newY + 40 > obstacle.y // Assuming player height is 40
            ) {
                collision = true;
                break;
            }
        }
        if (!collision) {
            // Update position if no collision
            player.x = newX;
            player.y = newY;
        }
        else {
            // Stop movement if collision occurs
            player.velocityX = 0;
            player.velocityY = 0;
        }
        // Update player angle based on velocity
        if (player.velocityX !== 0 || player.velocityY !== 0) {
            player.angle = Math.atan2(player.velocityY, player.velocityX);
        }
        // Apply friction only if no keys are pressed
        if (this.keysPressed.size === 0) {
            player.velocityX *= this.FRICTION;
            player.velocityY *= this.FRICTION;
        }
        // Constrain to world bounds
        player.x = Math.max(0, Math.min(this.WORLD_WIDTH, player.x));
        player.y = Math.max(0, Math.min(this.WORLD_HEIGHT, player.y));
        // Update server
        this.socket.emit('playerMovement', {
            x: player.x,
            y: player.y,
            angle: player.angle,
            velocityX: player.velocityX,
            velocityY: player.velocityY
        });
        this.checkDotCollision(player);
        this.checkEnemyCollision(player);
        this.updateCamera(player);
        this.checkItemCollision(player);
    }
    generateDots() {
        for (let i = 0; i < this.DOT_COUNT; i++) {
            this.generateDot();
        }
    }
    generateDot() {
        const dot = {
            x: Math.random() * this.WORLD_WIDTH,
            y: Math.random() * this.WORLD_HEIGHT
        };
        this.dots.push(dot);
    }
    checkDotCollision(player) {
        for (let i = this.dots.length - 1; i >= 0; i--) {
            const dot = this.dots[i];
            const dx = player.x - dot.x;
            const dy = player.y - dot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < this.DOT_SIZE + 20) {
                this.socket.emit('collectDot', i);
                player.score++;
                this.dots.splice(i, 1);
                this.generateDot();
            }
        }
    }
    checkEnemyCollision(player) {
        const currentTime = Date.now();
        if (currentTime - this.lastDamageTime < this.DAMAGE_COOLDOWN) {
            return;
        }
        this.enemies.forEach((enemy, enemyId) => {
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 40) { // Assuming both player and enemy are 40x40 pixels
                this.lastDamageTime = currentTime;
                this.socket.emit('collision', { enemyId });
            }
        });
    }
    checkItemCollision(player) {
        this.items.forEach(item => {
            const dx = player.x - item.x;
            const dy = player.y - item.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 40) {
                this.socket.emit('collectItem', item.id);
                // Update displays immediately for better responsiveness
                if (this.isInventoryOpen) {
                    this.updateInventoryDisplay();
                }
            }
        });
    }
    toggleInventory() {
        if (!this.inventoryPanel)
            return;
        const isOpen = this.inventoryPanel.style.display === 'block';
        if (!isOpen) {
            this.inventoryPanel.style.display = 'block';
            setTimeout(() => {
                var _a;
                (_a = this.inventoryPanel) === null || _a === void 0 ? void 0 : _a.classList.add('open');
            }, 10);
            this.updateInventoryDisplay();
        }
        else {
            this.inventoryPanel.classList.remove('open');
            setTimeout(() => {
                if (this.inventoryPanel) {
                    this.inventoryPanel.style.display = 'none';
                }
            }, 300); // Match transition duration
        }
        this.isInventoryOpen = !isOpen;
    }
    handlePlayerMoved(playerData) {
        // Update player position in single-player mode
        const player = this.players.get(playerData.id);
        if (player) {
            Object.assign(player, playerData);
            // Update camera position for the local player
            if (this.isSinglePlayer) {
                this.updateCamera(player);
            }
        }
    }
    handleEnemiesUpdate(enemiesData) {
        // Update enemies in single-player mode
        this.enemies.clear();
        enemiesData.forEach(enemy => this.enemies.set(enemy.id, enemy));
    }
    gameLoop() {
        var _a;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw ocean background
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Get current player for camera
        const currentSocketId = (_a = this.socket) === null || _a === void 0 ? void 0 : _a.id;
        if (currentSocketId) {
            const currentPlayer = this.players.get(currentSocketId);
            if (currentPlayer) {
                this.updateCamera(currentPlayer);
            }
        }
        this.ctx.save();
        this.ctx.translate(-this.cameraX, -this.cameraY);
        // Draw world bounds
        this.ctx.strokeStyle = 'black';
        this.ctx.strokeRect(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);
        // Draw zone indicators with updated colors
        const zones = [
            { name: 'Common', end: 2000, color: 'rgba(128, 128, 128, 0.1)' }, // Lighter gray
            { name: 'Uncommon', end: 4000, color: 'rgba(144, 238, 144, 0.1)' }, // Light green (LightGreen)
            { name: 'Rare', end: 6000, color: 'rgba(0, 0, 255, 0.1)' }, // Blue
            { name: 'Epic', end: 8000, color: 'rgba(128, 0, 128, 0.1)' }, // Purple
            { name: 'Legendary', end: 9000, color: 'rgba(255, 165, 0, 0.1)' }, // Orange
            { name: 'Mythic', end: this.WORLD_WIDTH, color: 'rgba(255, 0, 0, 0.1)' } // Red
        ];
        let start = 0;
        zones.forEach(zone => {
            // Draw zone background
            this.ctx.fillStyle = zone.color;
            this.ctx.fillRect(start, 0, zone.end - start, this.WORLD_HEIGHT);
            // Draw zone name
            this.ctx.fillStyle = 'black';
            this.ctx.font = '20px Arial';
            this.ctx.fillText(zone.name, start + 10, 30);
            start = zone.end;
        });
        // Draw dots
        this.ctx.fillStyle = 'yellow';
        this.dots.forEach(dot => {
            this.ctx.beginPath();
            this.ctx.arc(dot.x, dot.y, this.DOT_SIZE, 0, Math.PI * 2);
            this.ctx.fill();
        });
        // Draw sand first
        this.sands.forEach(sand => {
            this.ctx.save();
            this.ctx.translate(sand.x, sand.y);
            // Draw sand blob with opaque color
            this.ctx.fillStyle = '#FFE4B5'; // Moccasin color, fully opaque
            this.ctx.beginPath();
            // Draw static blob shape using the saved rotation
            this.ctx.moveTo(sand.radius * 0.8, 0);
            for (let angle = 0; angle <= Math.PI * 2; angle += Math.PI / 8) {
                // Use the sand's saved rotation for consistent shape
                const currentAngle = angle + sand.rotation;
                const randomRadius = sand.radius * 0.9; // Less variation for more consistent shape
                const x = Math.cos(currentAngle) * randomRadius;
                const y = Math.sin(currentAngle) * randomRadius;
                this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        });
        // Draw decorations (palm trees)
        this.decorations.forEach(decoration => {
            this.ctx.save();
            this.ctx.translate(decoration.x, decoration.y);
            this.ctx.scale(decoration.scale, decoration.scale);
            // Draw palm tree
            this.ctx.drawImage(this.palmSprite, -this.palmSprite.width / 2, -this.palmSprite.height / 2);
            this.ctx.restore();
        });
        // Draw players
        this.players.forEach((player, id) => {
            var _a, _b;
            this.ctx.save();
            this.ctx.translate(player.x, player.y);
            this.ctx.rotate(player.angle);
            // Apply hue rotation if it's the current player
            if (id === ((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id)) {
                const offscreen = document.createElement('canvas');
                offscreen.width = this.playerSprite.width;
                offscreen.height = this.playerSprite.height;
                const offCtx = offscreen.getContext('2d');
                offCtx.drawImage(this.playerSprite, 0, 0);
                const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
                this.applyHueRotation(offCtx, imageData);
                offCtx.putImageData(imageData, 0, 0);
                this.ctx.drawImage(offscreen, -this.playerSprite.width / 2, -this.playerSprite.height / 2);
            }
            else {
                this.ctx.drawImage(this.playerSprite, -this.playerSprite.width / 2, -this.playerSprite.height / 2);
            }
            this.ctx.restore();
            // Draw player name above player
            this.ctx.fillStyle = 'white';
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 2;
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            const nameText = player.name || 'Anonymous';
            // Draw text stroke
            this.ctx.strokeText(nameText, player.x, player.y - 50);
            // Draw text fill
            this.ctx.fillText(nameText, player.x, player.y - 50);
            // Draw stats on the left side if this is the current player
            if (id === ((_b = this.socket) === null || _b === void 0 ? void 0 : _b.id)) {
                // Save the current transform
                this.ctx.save();
                // Reset transform for UI elements
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                const statsX = 20; // Distance from left edge
                const statsY = 100; // Distance from top
                const barWidth = 200; // Wider bars
                const barHeight = 20; // Taller bars
                const spacing = 30; // Space between elements
                // Draw health bar
                this.ctx.fillStyle = 'black';
                this.ctx.fillRect(statsX, statsY, barWidth, barHeight);
                this.ctx.fillStyle = 'lime';
                this.ctx.fillRect(statsX, statsY, barWidth * (player.health / player.maxHealth), barHeight);
                // Draw health text
                this.ctx.fillStyle = 'white';
                this.ctx.font = '16px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`Health: ${Math.round(player.health)}/${player.maxHealth}`, statsX + 5, statsY + 15);
                // Draw XP bar
                if (player.level < this.MAX_LEVEL) {
                    this.ctx.fillStyle = '#4169E1';
                    this.ctx.fillRect(statsX, statsY + spacing, barWidth, barHeight);
                    this.ctx.fillStyle = '#00FFFF';
                    this.ctx.fillRect(statsX, statsY + spacing, barWidth * (player.xp / player.xpToNextLevel), barHeight);
                    // Draw XP text
                    this.ctx.fillStyle = 'white';
                    this.ctx.fillText(`XP: ${player.xp}/${player.xpToNextLevel}`, statsX + 5, statsY + spacing + 15);
                }
                // Draw level
                this.ctx.fillStyle = '#FFD700';
                this.ctx.font = '20px Arial';
                this.ctx.fillText(`Level ${player.level}`, statsX, statsY - 10);
                // Restore the transform
                this.ctx.restore();
            }
        });
        // Draw enemies
        this.enemies.forEach(enemy => {
            const sizeMultiplier = this.ENEMY_SIZE_MULTIPLIERS[enemy.tier];
            const enemySize = 40 * sizeMultiplier; // Base size * multiplier
            this.ctx.save();
            this.ctx.translate(enemy.x, enemy.y);
            this.ctx.rotate(enemy.angle);
            // Draw hitbox if enabled
            if (this.showHitboxes) {
                this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Semi-transparent red
                this.ctx.lineWidth = 2;
                // Draw rectangular hitbox
                this.ctx.strokeRect(-enemySize / 2, -enemySize / 2, enemySize, enemySize);
                // Draw center point
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 2, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)'; // Yellow dot for center
                this.ctx.fill();
                // Draw hitbox dimensions
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.fillText(`${Math.round(enemySize)}x${Math.round(enemySize)}`, 0, enemySize / 2 + 20);
            }
            // Draw enemy with color based on tier
            this.ctx.fillStyle = this.ENEMY_COLORS[enemy.tier];
            this.ctx.beginPath();
            this.ctx.arc(0, 0, enemySize / 2, 0, Math.PI * 2);
            this.ctx.fill();
            if (enemy.type === 'octopus') {
                this.ctx.drawImage(this.octopusSprite, -enemySize / 2, -enemySize / 2, enemySize, enemySize);
            }
            else {
                this.ctx.drawImage(this.fishSprite, -enemySize / 2, -enemySize / 2, enemySize, enemySize);
            }
            this.ctx.restore();
            // Draw health bar and tier indicator - adjust position based on size
            const maxHealth = this.ENEMY_MAX_HEALTH[enemy.tier];
            const healthBarWidth = 50 * sizeMultiplier;
            // Health bar
            this.ctx.fillStyle = 'black';
            this.ctx.fillRect(enemy.x - healthBarWidth / 2, enemy.y - enemySize / 2 - 10, healthBarWidth, 5);
            this.ctx.fillStyle = 'lime';
            this.ctx.fillRect(enemy.x - healthBarWidth / 2, enemy.y - enemySize / 2 - 10, healthBarWidth * (enemy.health / maxHealth), 5);
            // Tier text
            this.ctx.fillStyle = 'white';
            this.ctx.font = (12 * sizeMultiplier) + 'px Arial';
            this.ctx.fillText(enemy.tier.toUpperCase(), enemy.x - healthBarWidth / 2, enemy.y + enemySize / 2 + 15);
        });
        // Draw obstacles
        this.obstacles.forEach(obstacle => {
            if (obstacle.type === 'coral') {
                this.ctx.save();
                this.ctx.translate(obstacle.x, obstacle.y);
                if (obstacle.isEnemy) {
                    // Draw enemy coral with a reddish tint
                    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                    this.ctx.fillRect(0, 0, obstacle.width, obstacle.height);
                }
                this.ctx.drawImage(this.coralSprite, 0, 0, obstacle.width, obstacle.height);
                if (obstacle.isEnemy && obstacle.health !== undefined) {
                    // Draw health bar for enemy coral
                    this.ctx.fillStyle = 'red';
                    this.ctx.fillRect(0, -10, obstacle.width, 5);
                    this.ctx.fillStyle = 'green';
                    this.ctx.fillRect(0, -10, obstacle.width * (obstacle.health / this.ENEMY_CORAL_MAX_HEALTH), 5);
                }
                this.ctx.restore();
            }
        });
        // Draw items
        this.items.forEach(item => {
            const sprite = this.itemSprites[item.type];
            if (!sprite) {
                console.warn(`No sprite found for item type: ${item.type}`);
                return; // Skip drawing this item if sprite isn't loaded
            }
            // Draw rarity ring
            if (item.rarity) {
                this.ctx.save();
                // Draw outer ring
                this.ctx.beginPath();
                this.ctx.arc(item.x, item.y, 20, 0, Math.PI * 2);
                this.ctx.strokeStyle = this.ITEM_RARITY_COLORS[item.rarity];
                this.ctx.lineWidth = 3;
                // Add glow effect
                this.ctx.shadowColor = this.ITEM_RARITY_COLORS[item.rarity];
                this.ctx.shadowBlur = 10;
                this.ctx.stroke();
                this.ctx.restore();
            }
            // Draw the item sprite
            if (sprite.complete) { // Only draw if the sprite is fully loaded
                this.ctx.drawImage(sprite, item.x - 15, item.y - 15, 30, 30);
            }
        });
        // Draw player inventory
        const playerSocketId = this.socket.id; // Changed variable name
        if (playerSocketId) {
            const player = this.players.get(playerSocketId);
            if (player) {
                player.inventory.forEach((item, index) => {
                    const sprite = this.itemSprites[item.type];
                    this.ctx.drawImage(sprite, 10 + index * 40, 10, 30, 30);
                });
            }
        }
        this.ctx.restore();
        // Draw minimap (after restoring context)
        this.drawMinimap();
        // Draw floating texts
        this.floatingTexts = this.floatingTexts.filter(text => {
            text.y -= 1;
            text.alpha -= 1 / text.lifetime;
            if (text.alpha <= 0)
                return false;
            this.ctx.globalAlpha = text.alpha;
            this.ctx.fillStyle = text.color;
            this.ctx.font = text.fontSize + 'px Arial';
            this.ctx.fillText(text.text, text.x, text.y);
            this.ctx.globalAlpha = 1;
            return true;
        });
        // Don't process player input if dead
        if (!this.isPlayerDead) {
            // Process player movement and input
            this.updatePlayerVelocity();
        }
        this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }
    setupItemSprites() {
        return __awaiter(this, void 0, void 0, function* () {
            this.itemSprites = {};
            const itemTypes = ['health_potion', 'speed_boost', 'shield'];
            try {
                yield Promise.all(itemTypes.map((type) => __awaiter(this, void 0, void 0, function* () {
                    const sprite = new Image();
                    sprite.crossOrigin = "anonymous";
                    const url = yield this.getAssetUrl(`${type}.png`);
                    yield new Promise((resolve, reject) => {
                        sprite.onload = () => {
                            this.itemSprites[type] = sprite;
                            resolve();
                        };
                        sprite.onerror = (error) => {
                            console.error(`Failed to load sprite for ${type}:`, error);
                            reject(error);
                        };
                        sprite.src = url;
                    });
                })));
                console.log('All item sprites loaded successfully:', Object.keys(this.itemSprites));
            }
            catch (error) {
                console.error('Error loading item sprites:', error);
            }
        });
    }
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // Update any viewport-dependent calculations here
        // For example, you might want to adjust the camera bounds
        // console.log('Canvas resized to:', this.canvas.width, 'x', this.canvas.height);
    }
    cleanup() {
        var _a, _b, _c;
        // Save progress before cleanup if in single player mode
        if (this.isSinglePlayer && ((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id)) {
            const player = this.players.get(this.socket.id);
            if (player) {
                this.savePlayerProgress(player);
            }
        }
        // Stop the game loop
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        // Terminate the web worker if it exists
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        // Disconnect socket if it exists
        if (this.socket) {
            this.socket.disconnect();
        }
        // Clear all game data
        this.players.clear();
        this.enemies.clear();
        this.dots = [];
        this.obstacles = [];
        this.items = [];
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Reset and show title screen elements
        if (this.titleScreen) {
            this.titleScreen.style.display = 'flex';
            this.titleScreen.style.opacity = '1';
            this.titleScreen.style.zIndex = '1000';
        }
        if (this.nameInput) {
            this.nameInput.style.display = 'block';
            this.nameInput.style.opacity = '1';
        }
        // Hide exit button
        this.hideExitButton();
        // Show and reset game menu
        const gameMenu = document.getElementById('gameMenu');
        if (gameMenu) {
            gameMenu.style.display = 'flex';
            gameMenu.style.opacity = '1';
            gameMenu.style.zIndex = '3000';
        }
        // Reset canvas state
        this.canvas.style.zIndex = '0';
        // Clean up save indicator
        if (this.saveIndicatorTimeout) {
            clearTimeout(this.saveIndicatorTimeout);
        }
        (_b = this.saveIndicator) === null || _b === void 0 ? void 0 : _b.remove();
        this.saveIndicator = null;
        // Remove chat container
        (_c = this.chatContainer) === null || _c === void 0 ? void 0 : _c.remove();
        this.chatContainer = null;
        this.chatInput = null;
        this.chatMessages = null;
        // Clean up WebRTC connection
        if (this.signalingClient) {
            this.signalingClient.close();
            this.signalingClient = null;
        }
    }
    loadPlayerProgress() {
        const savedProgress = localStorage.getItem('playerProgress');
        if (savedProgress) {
            return JSON.parse(savedProgress);
        }
        return {
            level: 1,
            xp: 0,
            maxHealth: this.PLAYER_MAX_HEALTH,
            damage: this.PLAYER_DAMAGE
        };
    }
    savePlayerProgress(player) {
        const progress = {
            level: player.level,
            xp: player.xp,
            maxHealth: player.maxHealth,
            damage: player.damage
        };
        localStorage.setItem('playerProgress', JSON.stringify(progress));
    }
    calculateXPRequirement(level) {
        return Math.floor(this.BASE_XP_REQUIREMENT * Math.pow(this.XP_MULTIPLIER, level - 1));
    }
    // Add the showFloatingText method
    showFloatingText(x, y, text, color, fontSize) {
        this.floatingTexts.push({
            x,
            y,
            text,
            color,
            fontSize,
            alpha: 1,
            lifetime: 60 // frames
        });
    }
    showDeathScreen() {
        const deathScreen = document.getElementById('deathScreen');
        if (deathScreen) {
            deathScreen.style.display = 'flex';
        }
    }
    hideDeathScreen() {
        const deathScreen = document.getElementById('deathScreen');
        if (deathScreen) {
            deathScreen.style.display = 'none';
        }
    }
    // Add minimap drawing
    drawMinimap() {
        var _a;
        const minimapX = this.canvas.width - this.MINIMAP_WIDTH - this.MINIMAP_PADDING;
        const minimapY = this.MINIMAP_PADDING;
        // Draw minimap background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(minimapX, minimapY, this.MINIMAP_WIDTH, this.MINIMAP_HEIGHT);
        // Draw zones on minimap with matching colors
        const zones = [
            { color: 'rgba(128, 128, 128, 0.5)' }, // Gray
            { color: 'rgba(144, 238, 144, 0.5)' }, // Light green
            { color: 'rgba(0, 0, 255, 0.5)' }, // Blue
            { color: 'rgba(128, 0, 128, 0.5)' }, // Purple
            { color: 'rgba(255, 165, 0, 0.5)' }, // Orange
            { color: 'rgba(255, 0, 0, 0.5)' } // Red
        ];
        zones.forEach((zone, index) => {
            const zoneWidth = (this.MINIMAP_WIDTH / 6);
            this.ctx.fillStyle = zone.color;
            this.ctx.fillRect(minimapX + index * zoneWidth, minimapY, zoneWidth, this.MINIMAP_HEIGHT);
        });
        // Draw player position on minimap
        const minimapSocketId = (_a = this.socket) === null || _a === void 0 ? void 0 : _a.id; // Changed variable name
        if (minimapSocketId) {
            const player = this.players.get(minimapSocketId);
            if (player) {
                const playerMinimapX = minimapX + (player.x / this.WORLD_WIDTH) * this.MINIMAP_WIDTH;
                const playerMinimapY = minimapY + (player.y / this.WORLD_HEIGHT) * this.MINIMAP_HEIGHT;
                this.ctx.fillStyle = 'yellow';
                this.ctx.beginPath();
                this.ctx.arc(playerMinimapX, playerMinimapY, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    hideTitleScreen() {
        if (this.titleScreen) {
            this.titleScreen.style.display = 'none';
            this.titleScreen.style.opacity = '0';
        }
        if (this.nameInput) {
            this.nameInput.style.display = 'none';
            this.nameInput.style.opacity = '0';
        }
        // Hide game menu when game starts
        const gameMenu = document.getElementById('gameMenu');
        if (gameMenu) {
            gameMenu.style.display = 'none';
            gameMenu.style.opacity = '0';
        }
        // Ensure canvas is visible
        this.canvas.style.zIndex = '1';
    }
    showExitButton() {
        if (this.exitButtonContainer) {
            this.exitButtonContainer.style.display = 'block';
        }
    }
    hideExitButton() {
        if (this.exitButtonContainer) {
            this.exitButtonContainer.style.display = 'none';
        }
    }
    handleExit() {
        // Clean up game state
        this.cleanup();
        // Show title screen elements
        if (this.titleScreen) {
            this.titleScreen.style.display = 'flex';
            this.titleScreen.style.opacity = '1';
            this.titleScreen.style.zIndex = '1000';
        }
        if (this.nameInput) {
            this.nameInput.style.display = 'block';
            this.nameInput.style.opacity = '1';
        }
        // Hide exit button
        this.hideExitButton();
        // Show game menu with proper styling
        const gameMenu = document.getElementById('gameMenu');
        if (gameMenu) {
            gameMenu.style.display = 'flex';
            gameMenu.style.opacity = '1';
            gameMenu.style.zIndex = '3000';
        }
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Reset canvas visibility
        this.canvas.style.zIndex = '0';
    }
    applyHueRotation(ctx, imageData) {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            // Skip fully transparent pixels
            if (data[i + 3] === 0)
                continue;
            // Convert RGB to HSL
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            if (max === min) {
                h = s = 0; // achromatic
            }
            else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r:
                        h = (g - b) / d + (g < b ? 6 : 0);
                        break;
                    case g:
                        h = (b - r) / d + 2;
                        break;
                    case b:
                        h = (r - g) / d + 4;
                        break;
                    default: h = 0;
                }
                h /= 6;
            }
            // Only adjust hue if the pixel has some saturation
            if (s > 0.1) { // Threshold for considering a pixel colored
                h = (h + this.playerHue / 360) % 1;
                // Convert back to RGB
                if (s === 0) {
                    data[i] = data[i + 1] = data[i + 2] = l * 255;
                }
                else {
                    const hue2rgb = (p, q, t) => {
                        if (t < 0)
                            t += 1;
                        if (t > 1)
                            t -= 1;
                        if (t < 1 / 6)
                            return p + (q - p) * 6 * t;
                        if (t < 1 / 2)
                            return q;
                        if (t < 2 / 3)
                            return p + (q - p) * (2 / 3 - t) * 6;
                        return p;
                    };
                    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    const p = 2 * l - q;
                    data[i] = hue2rgb(p, q, h + 1 / 3) * 255;
                    data[i + 1] = hue2rgb(p, q, h) * 255;
                    data[i + 2] = hue2rgb(p, q, h - 1 / 3) * 255;
                }
            }
        }
    }
    updateColorPreview() {
        if (!this.playerSprite.complete)
            return;
        const ctx = this.colorPreviewCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.colorPreviewCanvas.width, this.colorPreviewCanvas.height);
        // Draw the sprite centered in the preview
        const scale = Math.min(this.colorPreviewCanvas.width / this.playerSprite.width, this.colorPreviewCanvas.height / this.playerSprite.height);
        const x = (this.colorPreviewCanvas.width - this.playerSprite.width * scale) / 2;
        const y = (this.colorPreviewCanvas.height - this.playerSprite.height * scale) / 2;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.drawImage(this.playerSprite, 0, 0);
        const imageData = ctx.getImageData(0, 0, this.colorPreviewCanvas.width, this.colorPreviewCanvas.height);
        this.applyHueRotation(ctx, imageData);
        ctx.putImageData(imageData, 0, 0);
        ctx.restore();
    }
    equipItemToLoadout(inventoryIndex, loadoutSlot) {
        var _a, _b;
        const player = this.players.get(((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id) || '');
        if (!player || loadoutSlot >= this.LOADOUT_SLOTS)
            return;
        const item = player.inventory[inventoryIndex];
        if (!item)
            return;
        console.log('Moving item from inventory to loadout:', {
            item,
            fromIndex: inventoryIndex,
            toSlot: loadoutSlot
        });
        // Create a copy of the current state
        const newInventory = [...player.inventory];
        const newLoadout = [...player.loadout];
        // Remove item from inventory
        newInventory.splice(inventoryIndex, 1);
        // If there's an item in the loadout slot, move it to inventory
        const existingItem = newLoadout[loadoutSlot];
        if (existingItem) {
            newInventory.push(existingItem);
        }
        // Equip new item to loadout
        newLoadout[loadoutSlot] = item;
        // Update player's state
        player.inventory = newInventory;
        player.loadout = newLoadout;
        // Update server
        (_b = this.socket) === null || _b === void 0 ? void 0 : _b.emit('updateLoadout', {
            loadout: newLoadout,
            inventory: newInventory
        });
        // Force immediate visual updates
        requestAnimationFrame(() => {
            this.updateInventoryDisplay();
            this.updateLoadoutDisplay();
        });
        console.log('Updated player state:', {
            inventory: player.inventory,
            loadout: player.loadout
        });
    }
    useLoadoutItem(slot) {
        var _a, _b, _c;
        const player = this.players.get(((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id) || '');
        if (!player || !player.loadout[slot])
            return;
        const item = player.loadout[slot];
        if (!item || item.onCooldown)
            return; // Check for cooldown
        // Use the item
        (_b = this.socket) === null || _b === void 0 ? void 0 : _b.emit('useItem', item.id);
        console.log('Used item:', item.id);
        // Listen for item effects
        (_c = this.socket) === null || _c === void 0 ? void 0 : _c.on('speedBoostActive', (playerId) => {
            var _a;
            if (playerId === ((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id)) {
                this.speedBoostActive = true;
                console.log('Speed boost activated');
            }
        });
        // Show floating text based on item type and rarity
        const rarityMultipliers = {
            common: 1,
            uncommon: 1.5,
            rare: 2,
            epic: 2.5,
            legendary: 3,
            mythic: 4
        };
        const multiplier = item.rarity ? rarityMultipliers[item.rarity] : 1;
        switch (item.type) {
            case 'health_potion':
                this.showFloatingText(player.x, player.y - 30, `+${Math.floor(50 * multiplier)} HP`, '#32CD32', 20);
                break;
            case 'speed_boost':
                this.showFloatingText(player.x, player.y - 30, `Speed Boost (${Math.floor(5 * multiplier)}s)`, '#4169E1', 20);
                break;
            case 'shield':
                this.showFloatingText(player.x, player.y - 30, `Shield (${Math.floor(3 * multiplier)}s)`, '#FFD700', 20);
                break;
        }
        // Add visual cooldown effect to the loadout slot
        const slot_element = document.querySelector(`.loadout-slot[data-slot="${slot}"]`);
        if (slot_element) {
            slot_element.classList.add('on-cooldown');
            // Remove cooldown class when cooldown is complete
            const cooldownTime = 10000 * (1 / multiplier); // 10 seconds base, reduced by rarity
            setTimeout(() => {
                slot_element.classList.remove('on-cooldown');
            }, cooldownTime);
        }
        // Update displays
        if (this.isInventoryOpen) {
            this.updateInventoryDisplay();
        }
        this.updateLoadoutDisplay();
    }
    updateLoadoutDisplay() {
        var _a;
        const player = this.players.get(((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id) || '');
        if (!player)
            return;
        const slots = document.querySelectorAll('.loadout-slot');
        slots.forEach((slot, index) => {
            // Clear existing content
            slot.innerHTML = '';
            // Add item if it exists in that slot
            const item = player.loadout[index];
            if (item) {
                const img = document.createElement('img');
                img.src = `./assets/${item.type}.png`;
                img.alt = item.type;
                img.style.width = '80%';
                img.style.height = '80%';
                img.style.objectFit = 'contain';
                slot.appendChild(img);
            }
            // Add key binding text
            const keyText = document.createElement('div');
            keyText.className = 'key-binding';
            keyText.textContent = this.LOADOUT_KEY_BINDINGS[index];
            slot.appendChild(keyText);
        });
    }
    setupDragAndDrop() {
        // Add global drop handler
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        document.addEventListener('drop', (e) => {
            var _a;
            e.preventDefault();
            const dragEvent = e;
            const target = e.target;
            // If not dropping on loadout slot or inventory grid, return item to inventory
            if (!target.closest('.loadout-slot') && !target.closest('.inventory-grid')) {
                const loadoutSlot = (_a = dragEvent.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/loadoutSlot');
                if (loadoutSlot) {
                    this.moveItemToInventory(parseInt(loadoutSlot));
                }
            }
        });
        // Make loadout items draggable
        const updateLoadoutDraggable = () => {
            const slots = document.querySelectorAll('.loadout-slot');
            slots.forEach((slot, slotIndex) => {
                const img = slot.querySelector('img');
                if (img) {
                    img.draggable = true;
                    img.addEventListener('dragstart', (e) => {
                        var _a;
                        const dragEvent = e;
                        (_a = dragEvent.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData('text/loadoutSlot', slotIndex.toString());
                        dragEvent.dataTransfer.effectAllowed = 'move';
                    });
                }
            });
        };
        // Update loadout items draggable state whenever the display updates
        const originalUpdateLoadoutDisplay = this.updateLoadoutDisplay.bind(this);
        this.updateLoadoutDisplay = () => {
            originalUpdateLoadoutDisplay();
            updateLoadoutDraggable();
        };
        // Handle drops on loadout slots
        const slots = document.querySelectorAll('.loadout-slot');
        slots.forEach((slot, slotIndex) => {
            // Set the slot index as a data attribute
            slot.dataset.slot = slotIndex.toString();
            slot.addEventListener('dragenter', (e) => {
                e.preventDefault();
                e.currentTarget.classList.add('drag-over');
            });
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                const dragEvent = e;
                dragEvent.dataTransfer.dropEffect = 'move';
                e.currentTarget.classList.add('drag-over');
            });
            slot.addEventListener('dragleave', (e) => {
                e.currentTarget.classList.remove('drag-over');
            });
            slot.addEventListener('drop', (e) => {
                var _a, _b;
                e.preventDefault();
                const dragEvent = e;
                const target = e.currentTarget;
                target.classList.remove('drag-over');
                // Check if the drop is from inventory or loadout
                const inventoryIndex = (_a = dragEvent.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
                const fromLoadoutSlot = (_b = dragEvent.dataTransfer) === null || _b === void 0 ? void 0 : _b.getData('text/loadoutSlot');
                if (inventoryIndex) {
                    // Drop from inventory to loadout
                    const index = parseInt(inventoryIndex);
                    const slot = parseInt(target.dataset.slot || '-1');
                    if (index >= 0 && slot >= 0) {
                        this.equipItemToLoadout(index, slot);
                    }
                }
                else if (fromLoadoutSlot) {
                    // Drop from loadout to loadout (swap items)
                    const fromSlot = parseInt(fromLoadoutSlot);
                    const toSlot = slotIndex;
                    if (fromSlot !== toSlot) {
                        this.swapLoadoutItems(fromSlot, toSlot);
                    }
                }
            });
        });
        // Make inventory panel a drop target for loadout items
        if (this.inventoryPanel) {
            const grid = this.inventoryPanel.querySelector('.inventory-grid');
            if (grid) {
                grid.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    const dragEvent = e;
                    dragEvent.dataTransfer.dropEffect = 'move';
                    grid.classList.add('drag-over');
                });
                grid.addEventListener('dragleave', (e) => {
                    grid.classList.remove('drag-over');
                });
                grid.addEventListener('drop', (e) => {
                    var _a;
                    e.preventDefault();
                    grid.classList.remove('drag-over');
                    const dragEvent = e;
                    const loadoutSlot = (_a = dragEvent.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/loadoutSlot');
                    if (loadoutSlot) {
                        this.moveItemToInventory(parseInt(loadoutSlot));
                    }
                });
            }
        }
    }
    // Add method to swap loadout items
    swapLoadoutItems(fromSlot, toSlot) {
        var _a, _b;
        const player = this.players.get(((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id) || '');
        if (!player)
            return;
        const newLoadout = [...player.loadout];
        [newLoadout[fromSlot], newLoadout[toSlot]] = [newLoadout[toSlot], newLoadout[fromSlot]];
        // Update player's state
        player.loadout = newLoadout;
        // Update server
        (_b = this.socket) === null || _b === void 0 ? void 0 : _b.emit('updateLoadout', {
            loadout: newLoadout,
            inventory: player.inventory
        });
        // Force immediate visual updates
        this.updateLoadoutDisplay();
    }
    // Update the updateInventoryDisplay method
    updateInventoryDisplay() {
        var _a;
        if (!this.inventoryPanel)
            return;
        const player = this.players.get(((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id) || '');
        if (!player)
            return;
        const content = this.inventoryPanel.querySelector('.inventory-content');
        if (!content)
            return;
        content.innerHTML = '';
        // Add inventory title
        const title = document.createElement('h2');
        title.textContent = 'Inventory';
        content.appendChild(title);
        // Group items by rarity
        const itemsByRarity = {
            mythic: [],
            legendary: [],
            epic: [],
            rare: [],
            uncommon: [],
            common: []
        };
        // Sort items into rarity groups
        player.inventory.forEach(item => {
            const rarity = item.rarity || 'common';
            itemsByRarity[rarity].push(item);
        });
        // Create inventory grid container
        const gridContainer = document.createElement('div');
        gridContainer.className = 'inventory-grid-container';
        gridContainer.style.cssText = `
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 10px;
      `;
        // Create rows for each rarity that has items
        Object.entries(itemsByRarity).forEach(([rarity, items]) => {
            if (items.length > 0) {
                // Create rarity row container
                const rarityRow = document.createElement('div');
                rarityRow.className = 'rarity-row';
                rarityRow.style.cssText = `
                  display: flex;
                  flex-direction: column;
                  gap: 5px;
              `;
                // Add rarity label
                const rarityLabel = document.createElement('div');
                rarityLabel.textContent = rarity.toUpperCase();
                rarityLabel.style.cssText = `
                  color: ${this.ITEM_RARITY_COLORS[rarity]};
                  font-weight: bold;
                  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
                  padding-left: 5px;
              `;
                rarityRow.appendChild(rarityLabel);
                // Create grid for this rarity's items
                const grid = document.createElement('div');
                grid.className = 'inventory-grid';
                grid.style.cssText = `
                  display: flex;
                  flex-wrap: wrap;
                  gap: 5px;
                  padding: 5px;
                  background: rgba(0, 0, 0, 0.2);
                  border-radius: 5px;
                  border: 1px solid ${this.ITEM_RARITY_COLORS[rarity]}40;
              `;
                // Add items to grid
                items.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'inventory-item';
                    itemElement.draggable = true;
                    // Style for item slot
                    itemElement.style.cssText = `
                      position: relative;
                      width: 50px;
                      height: 50px;
                      background-color: ${this.ITEM_RARITY_COLORS[rarity]}20;
                      border: 2px solid ${this.ITEM_RARITY_COLORS[rarity]};
                      border-radius: 5px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      cursor: pointer;
                      transition: all 0.2s ease;
                  `;
                    // Add hover effect
                    itemElement.addEventListener('mouseover', () => {
                        itemElement.style.transform = 'scale(1.05)';
                        itemElement.style.boxShadow = `0 0 10px ${this.ITEM_RARITY_COLORS[rarity]}`;
                    });
                    itemElement.addEventListener('mouseout', () => {
                        itemElement.style.transform = 'scale(1)';
                        itemElement.style.boxShadow = 'none';
                    });
                    // Add drag functionality
                    itemElement.addEventListener('dragstart', (e) => {
                        var _a;
                        const index = player.inventory.findIndex(i => i.id === item.id);
                        (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData('text/plain', index.toString());
                        itemElement.classList.add('dragging');
                    });
                    itemElement.addEventListener('dragend', () => {
                        itemElement.classList.remove('dragging');
                    });
                    // Add item image
                    const img = document.createElement('img');
                    img.src = `./assets/${item.type}.png`;
                    img.alt = item.type;
                    img.draggable = false;
                    img.style.cssText = `
                      width: 40px;
                      height: 40px;
                      object-fit: contain;
                  `;
                    itemElement.appendChild(img);
                    grid.appendChild(itemElement);
                });
                rarityRow.appendChild(grid);
                gridContainer.appendChild(rarityRow);
            }
        });
        content.appendChild(gridContainer);
    }
    // Add this method to the Game class
    moveItemToInventory(loadoutSlot) {
        var _a, _b;
        const player = this.players.get(((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id) || '');
        if (!player)
            return;
        const item = player.loadout[loadoutSlot];
        if (!item)
            return;
        console.log('Moving item from loadout to inventory:', {
            item,
            fromSlot: loadoutSlot
        });
        // Create a copy of the current state
        const newInventory = [...player.inventory];
        const newLoadout = [...player.loadout];
        // Move item to inventory
        newInventory.push(item);
        // Remove from loadout
        newLoadout[loadoutSlot] = null;
        // Update player's state
        player.inventory = newInventory;
        player.loadout = newLoadout;
        // Update server
        (_b = this.socket) === null || _b === void 0 ? void 0 : _b.emit('updateLoadout', {
            loadout: newLoadout,
            inventory: newInventory
        });
        // Force immediate visual updates
        requestAnimationFrame(() => {
            this.updateInventoryDisplay();
            this.updateLoadoutDisplay();
        });
        console.log('Updated player state:', {
            inventory: player.inventory,
            loadout: player.loadout
        });
    }
    showSaveIndicator() {
        if (!this.saveIndicator)
            return;
        // Clear any existing timeout
        if (this.saveIndicatorTimeout) {
            clearTimeout(this.saveIndicatorTimeout);
        }
        // Show the indicator
        this.saveIndicator.style.display = 'block';
        this.saveIndicator.style.opacity = '1';
        // Hide after 2 seconds
        this.saveIndicatorTimeout = setTimeout(() => {
            if (this.saveIndicator) {
                this.saveIndicator.style.opacity = '0';
                setTimeout(() => {
                    if (this.saveIndicator) {
                        this.saveIndicator.style.display = 'none';
                    }
                }, 300); // Match transition duration
            }
        }, 2000);
    }
    // Add this helper method to handle asset URLs
    getAssetUrl(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            // Remove the file extension to get the asset key
            const assetKey = filename.replace('.png', '');
            // If running from file:// protocol, use base64 data
            if (window.location.protocol === 'file:') {
                // Get the base64 data from our assets
                const base64Data = IMAGE_ASSETS[assetKey];
                if (base64Data) {
                    return base64Data;
                }
                console.error(`No base64 data found for asset: ${filename}`);
            }
            // Otherwise use normal URL
            return `./assets/${filename}`;
        });
    }
    // Update the sanitizeHTML method to handle script tags
    sanitizeHTML(str) {
        // Add 'script' to allowed tags
        const allowedTags = new Set(['b', 'i', 'u', 'strong', 'em', 'span', 'color', 'blink', 'script']);
        const allowedAttributes = new Set(['style', 'color']);
        // Create a temporary div to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = str;
        // Recursive function to sanitize nodes
        const sanitizeNode = (node) => {
            var _a, _b;
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node;
                const tagName = element.tagName.toLowerCase();
                if (tagName === 'script') {
                    // Generate unique ID for this script
                    const scriptId = 'script_' + Math.random().toString(36).substr(2, 9);
                    // Store the script content
                    this.pendingScripts.set(scriptId, {
                        id: scriptId,
                        code: element.textContent || '',
                        sender: 'Unknown' // Will be set properly in addChatMessage
                    });
                    // Replace script with a warning button
                    const warningBtn = document.createElement('button');
                    warningBtn.className = 'script-warning';
                    warningBtn.setAttribute('data-script-id', scriptId);
                    warningBtn.style.cssText = `
                      background: rgba(255, 165, 0, 0.2);
                      border: 1px solid orange;
                      color: white;
                      padding: 2px 5px;
                      border-radius: 3px;
                      cursor: pointer;
                      font-size: 12px;
                      margin: 0 5px;
                  `;
                    warningBtn.textContent = '⚠️ Click to run script';
                    // Replace the script node with our warning button
                    (_a = node.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(warningBtn, node);
                    return;
                }
                // Remove node if tag is not allowed
                if (!allowedTags.has(tagName)) {
                    (_b = node.parentNode) === null || _b === void 0 ? void 0 : _b.removeChild(node);
                    return;
                }
                // Add blinking animation for blink tag
                if (tagName === 'blink') {
                    element.style.animation = 'blink 1s step-start infinite';
                }
                // Remove disallowed attributes
                Array.from(element.attributes).forEach(attr => {
                    if (!allowedAttributes.has(attr.name.toLowerCase())) {
                        element.removeAttribute(attr.name);
                    }
                });
                // Sanitize style attribute
                const style = element.getAttribute('style');
                if (style) {
                    // Allow color and animation styles
                    const safeStyle = style.split(';')
                        .filter(s => {
                        const prop = s.trim().toLowerCase();
                        return prop.startsWith('color:') || prop.startsWith('animation:');
                    })
                        .join(';');
                    if (safeStyle) {
                        element.setAttribute('style', safeStyle);
                    }
                    else {
                        element.removeAttribute('style');
                    }
                }
                // Recursively sanitize child nodes
                Array.from(node.childNodes).forEach(sanitizeNode);
            }
        };
        // Sanitize all nodes
        Array.from(temp.childNodes).forEach(sanitizeNode);
        return temp.innerHTML;
    }
    // Add method to create sandbox and run script
    createSandbox(script) {
        // Create modal for confirmation
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          padding: 20px;
          border-radius: 5px;
          border: 1px solid orange;
          color: white;
          z-index: 2000;
          font-family: Arial, sans-serif;
          max-width: 80%;
      `;
        const content = document.createElement('div');
        content.innerHTML = `
          <h3 style="color: orange;">⚠️ Warning: Script Execution</h3>
          <p>Script from user: ${script.sender}</p>
          <pre style="
              background: rgba(255, 255, 255, 0.1);
              padding: 10px;
              border-radius: 3px;
              max-height: 200px;
              overflow-y: auto;
              white-space: pre-wrap;
          ">${script.code}</pre>
          <p style="color: orange;">This script will run in a sandboxed environment with limited capabilities.</p>
      `;
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
          display: flex;
          gap: 10px;
          margin-top: 15px;
          justify-content: center;
      `;
        const runButton = document.createElement('button');
        runButton.textContent = 'Run Script';
        runButton.style.cssText = `
          background: orange;
          color: black;
          border: none;
          padding: 5px 15px;
          border-radius: 3px;
          cursor: pointer;
      `;
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
          background: #666;
          color: white;
          border: none;
          padding: 5px 15px;
          border-radius: 3px;
          cursor: pointer;
      `;
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(runButton);
        modal.appendChild(content);
        modal.appendChild(buttonContainer);
        document.body.appendChild(modal);
        // Handle button clicks
        cancelButton.onclick = () => {
            document.body.removeChild(modal);
        };
        runButton.onclick = () => {
            try {
                // Create sandbox iframe
                const sandbox = document.createElement('iframe');
                sandbox.style.display = 'none';
                document.body.appendChild(sandbox);
                // Create restricted context
                const restrictedWindow = sandbox.contentWindow;
                if (restrictedWindow) {
                    // Define allowed APIs
                    const safeContext = {
                        console: {
                            log: (...args) => {
                                this.addChatMessage({
                                    sender: 'Script Output',
                                    content: args.join(' '),
                                    timestamp: Date.now()
                                });
                            }
                        },
                        alert: (msg) => {
                            this.addChatMessage({
                                sender: 'Script Alert',
                                content: msg,
                                timestamp: Date.now()
                            });
                        },
                        // Add more safe APIs as needed
                    };
                    // Run the script in sandbox using Function constructor instead of eval
                    const wrappedCode = `
                      try {
                          const runScript = new Function('safeContext', 'with (safeContext) { ${script.code} }');
                          runScript(${JSON.stringify(safeContext)});
                      } catch (error) {
                          console.log('Script Error:', error.message);
                      }
                  `;
                    // Use Function constructor instead of direct eval
                    const scriptRunner = new Function('safeContext', wrappedCode);
                    scriptRunner(safeContext);
                }
                // Cleanup
                document.body.removeChild(sandbox);
                document.body.removeChild(modal);
            }
            catch (error) {
                this.addChatMessage({
                    sender: 'Script Error',
                    content: `Failed to execute script: ${error}`,
                    timestamp: Date.now()
                });
                document.body.removeChild(modal);
            }
        };
    }
    // Update addChatMessage to handle script buttons
    addChatMessage(message) {
        if (!this.chatMessages)
            return;
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.style.cssText = `
          margin: 2px 0;
          font-size: 14px;
          word-wrap: break-word;
          font-family: Arial, sans-serif;
      `;
        const time = new Date(message.timestamp).toLocaleTimeString();
        // Update pending scripts with sender information
        const sanitizedContent = this.sanitizeHTML(message.content);
        this.pendingScripts.forEach(script => {
            script.sender = message.sender;
        });
        messageElement.innerHTML = `
          <span class="chat-time" style="color: rgba(255, 255, 255, 0.6);">[${time}]</span>
          <span class="chat-sender" style="color: #00ff00;">${message.sender}:</span>
          <span style="color: white;">${sanitizedContent}</span>
      `;
        // Add click handlers for script buttons
        messageElement.querySelectorAll('.script-warning').forEach(button => {
            button.addEventListener('click', () => {
                const scriptId = button.getAttribute('data-script-id');
                if (scriptId) {
                    const script = this.pendingScripts.get(scriptId);
                    if (script) {
                        this.createSandbox(script);
                        this.pendingScripts.delete(scriptId);
                    }
                }
            });
        });
        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        while (this.chatMessages.children.length > 100) {
            this.chatMessages.removeChild(this.chatMessages.firstChild);
        }
    }
    // Update the help message in initializeChat
    initializeChat() {
        // Add blink animation style to document
        const style = document.createElement('style');
        style.textContent = `
          @keyframes blink {
              50% { opacity: 0; }
          }
      `;
        document.head.appendChild(style);
        // Create chat container with updated styling
        this.chatContainer = document.createElement('div');
        this.chatContainer.className = 'chat-container';
        this.chatContainer.style.cssText = `
          position: fixed;
          bottom: 10px;
          left: 10px;
          width: 300px;
          height: 200px;
          background: transparent;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          font-family: Arial, sans-serif;
      `;
        // Create messages container with transparent background
        this.chatMessages = document.createElement('div');
        this.chatMessages.className = 'chat-messages';
        this.chatMessages.style.cssText = `
          flex-grow: 1;
          overflow-y: auto;
          padding: 5px;
          color: white;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
          background: transparent;
          font-family: Arial, sans-serif;
      `;
        // Create input container
        const inputContainer = document.createElement('div');
        inputContainer.className = 'chat-input-container';
        inputContainer.style.cssText = `
          padding: 5px;
          background: transparent;
          font-family: Arial, sans-serif;
      `;
        // Create input field with semi-transparent background
        this.chatInput = document.createElement('input');
        this.chatInput.type = 'text';
        this.chatInput.placeholder = 'Press Enter to chat...';
        this.chatInput.className = 'chat-input';
        this.chatInput.style.cssText = `
          width: 100%;
          padding: 5px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 3px;
          background: rgba(0, 0, 0, 0.3);
          color: white;
          outline: none;
          font-family: Arial, sans-serif;
      `;
        // Add event listeners
        this.chatInput.addEventListener('focus', () => {
            this.isChatFocused = true;
            // Make input background slightly more opaque when focused
            this.chatInput.style.background = 'rgba(0, 0, 0, 0.5)';
        });
        this.chatInput.addEventListener('blur', () => {
            this.isChatFocused = false;
            // Restore original transparency when blurred
            this.chatInput.style.background = 'rgba(0, 0, 0, 0.3)';
        });
        // Update the help message to include blink tag
        this.chatInput.addEventListener('keypress', (e) => {
            var _a;
            if (e.key === 'Enter' && ((_a = this.chatInput) === null || _a === void 0 ? void 0 : _a.value.trim())) {
                if (this.chatInput.value.trim().toLowerCase() === '/help') {
                    this.addChatMessage({
                        sender: 'System',
                        content: `Available HTML tags: 
                          <b>bold</b>, 
                          <i>italic</i>, 
                          <u>underline</u>, 
                          <span style="color: red">colored text</span>,
                          <blink>blinking text</blink>,
                          <script>console.log('Hello!')</script> (sandboxed). 
                          Example: Hello <b>world</b> in <span style="color: #ff0000">red</span> and <blink>blinking</blink>!
                          Script example: <script>alert('Hello from script!');</script>`,
                        timestamp: Date.now()
                    });
                    this.chatInput.value = '';
                    return;
                }
                this.socket.emit('chatMessage', this.chatInput.value.trim());
                this.chatInput.value = '';
            }
        });
        // Assemble chat UI
        inputContainer.appendChild(this.chatInput);
        this.chatContainer.appendChild(this.chatMessages);
        this.chatContainer.appendChild(inputContainer);
        document.body.appendChild(this.chatContainer);
        // Request chat history
        this.socket.emit('requestChatHistory');
    }
    // Add to Game class properties
    initializeCrafting() {
        // Create crafting panel
        this.craftingPanel = document.createElement('div');
        this.craftingPanel.id = 'craftingPanel';
        this.craftingPanel.className = 'crafting-panel';
        this.craftingPanel.style.display = 'none';
        // Create crafting grid
        const craftingGrid = document.createElement('div');
        craftingGrid.className = 'crafting-grid';
        // Create 4 crafting slots
        for (let i = 0; i < 4; i++) {
            const slot = document.createElement('div');
            slot.className = 'crafting-slot';
            slot.dataset.index = i.toString();
            // Add drop zone functionality
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drag-over');
            });
            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });
            slot.addEventListener('drop', (e) => {
                var _a;
                e.preventDefault();
                slot.classList.remove('drag-over');
                const itemIndex = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
                if (itemIndex) {
                    this.addItemToCraftingSlot(parseInt(itemIndex), i);
                }
            });
            craftingGrid.appendChild(slot);
        }
        // Create craft button
        const craftButton = document.createElement('button');
        craftButton.className = 'craft-button';
        craftButton.textContent = 'Craft';
        craftButton.addEventListener('click', () => this.craftItems());
        this.craftingPanel.appendChild(craftingGrid);
        this.craftingPanel.appendChild(craftButton);
        document.body.appendChild(this.craftingPanel);
        // Add crafting styles
        const style = document.createElement('style');
        style.textContent = `
          .crafting-panel {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(0, 0, 0, 0.9);
              padding: 20px;
              border-radius: 10px;
              border: 2px solid #666;
              display: none;
              z-index: 1000;
          }

          .crafting-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
              margin-bottom: 20px;
          }

          .crafting-slot {
              width: 60px;
              height: 60px;
              background: rgba(255, 255, 255, 0.1);
              border: 2px solid #666;
              border-radius: 5px;
              display: flex;
              align-items: center;
              justify-content: center;
          }

          .crafting-slot.drag-over {
              border-color: #00ff00;
              background: rgba(0, 255, 0, 0.2);
          }

          .craft-button {
              width: 100%;
              padding: 10px;
              background: #4CAF50;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 16px;
          }

          .craft-button:hover {
              background: #45a049;
          }

          .craft-button:disabled {
              background: #666;
              cursor: not-allowed;
          }
      `;
        document.head.appendChild(style);
    }
    // Add to Game class properties
    toggleCrafting() {
        if (!this.craftingPanel)
            return;
        this.isCraftingOpen = !this.isCraftingOpen;
        this.craftingPanel.style.display = this.isCraftingOpen ? 'block' : 'none';
        if (this.isCraftingOpen) {
            this.updateCraftingDisplay();
        }
    }
    // Add to Game class properties
    addItemToCraftingSlot(inventoryIndex, slotIndex) {
        var _a;
        const player = this.players.get(((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id) || '');
        if (!player)
            return;
        const item = player.inventory[inventoryIndex];
        if (!item)
            return;
        // Check if slot already has an item
        if (this.craftingSlots[slotIndex].item) {
            return;
        }
        // Check if item can be added (same type and rarity as other items)
        const existingItems = this.craftingSlots.filter(slot => slot.item !== null);
        if (existingItems.length > 0) {
            const firstItem = existingItems[0].item;
            if (item.type !== firstItem.type || item.rarity !== firstItem.rarity) {
                this.showFloatingText(this.canvas.width / 2, 50, 'Items must be of the same type and rarity!', '#FF0000', 20);
                return;
            }
        }
        // Add item to crafting slot
        this.craftingSlots[slotIndex].item = item;
        // Remove item from inventory
        player.inventory.splice(inventoryIndex, 1);
        // Update displays
        this.updateCraftingDisplay();
        this.updateInventoryDisplay();
    }
    // Add to Game class properties
    craftItems() {
        var _a, _b;
        const player = this.players.get(((_a = this.socket) === null || _a === void 0 ? void 0 : _a.id) || '');
        if (!player)
            return;
        // Check if all slots are filled
        if (!this.craftingSlots.every(slot => slot.item !== null)) {
            this.showFloatingText(this.canvas.width / 2, 50, 'All slots must be filled to craft!', '#FF0000', 20);
            return;
        }
        // Get items for crafting
        const craftingItems = this.craftingSlots
            .map(slot => slot.item)
            .filter((item) => item !== null);
        // Send crafting request to server
        (_b = this.socket) === null || _b === void 0 ? void 0 : _b.emit('craftItems', { items: craftingItems });
        // Clear crafting slots immediately for responsiveness
        this.craftingSlots.forEach(slot => slot.item = null);
        this.updateCraftingDisplay();
    }
    // Add to Game class properties
    updateCraftingDisplay() {
        const slots = document.querySelectorAll('.crafting-slot');
        slots.forEach((slot, index) => {
            // Clear existing content
            slot.innerHTML = '';
            const craftingSlot = this.craftingSlots[index];
            if (craftingSlot.item) {
                const img = document.createElement('img');
                img.src = `./assets/${craftingSlot.item.type}.png`;
                img.alt = craftingSlot.item.type;
                img.style.width = '80%';
                img.style.height = '80%';
                img.style.objectFit = 'contain';
                // Add rarity border color
                if (craftingSlot.item.rarity) {
                    slot.style.borderColor = this.ITEM_RARITY_COLORS[craftingSlot.item.rarity];
                }
                slot.appendChild(img);
            }
            else {
                slot.style.borderColor = '#666';
            }
        });
    }
    // Add a method to save the server IP
    saveServerIP() {
        const serverIPInput = document.getElementById('serverIP');
        if (serverIPInput === null || serverIPInput === void 0 ? void 0 : serverIPInput.value) {
            localStorage.setItem('lastServerIP', serverIPInput.value);
        }
    }
    // Add a method to load the saved server IP
    loadServerIP() {
        const savedIP = localStorage.getItem('lastServerIP');
        if (savedIP) {
            const serverIPInputs = document.querySelectorAll('#serverIP');
            serverIPInputs.forEach(input => {
                input.value = savedIP;
            });
        }
    }
    // Add this new method to create the connection modal
    createConnectionModal() {
        // Create modal container
        this.connectionModal = document.createElement('div');
        this.connectionModal.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          padding: 20px;
          border-radius: 10px;
          border: 2px solid #666;
          z-index: 3001;
          color: white;
          font-family: Arial, sans-serif;
          min-width: 300px;
      `;
        // Create modal content
        const content = document.createElement('div');
        content.innerHTML = `
          <h2 style="margin-bottom: 20px; color: #4CAF50;">Connect to Server</h2>
          <div style="margin-bottom: 15px;">
              <select id="connectionType" style="
                  width: 100%;
                  padding: 8px;
                  margin-bottom: 10px;
                  border: 1px solid #666;
                  border-radius: 4px;
                  background: rgba(255, 255, 255, 0.1);
                  color: white;
              ">
                  <option value="socket">Socket.IO Server</option>
                  <option value="webrtc">Self-Hosted Server</option>
              </select>
              <input type="text" id="serverUrlInput" placeholder="Enter server URL" 
                     value="https://localhost:3000" style="
                  width: 100%;
                  padding: 8px;
                  margin-bottom: 10px;
                  border: 1px solid #666;
                  border-radius: 4px;
                  background: rgba(255, 255, 255, 0.1);
                  color: white;
              ">
              <div style="font-size: 12px; color: #999; margin-top: 5px;">
                  Socket.IO Example: https://localhost:3000
                  <br>
                  Self-Hosted Example: wss://localhost:8080
              </div>
          </div>
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button id="cancelConnection" style="
                  padding: 8px 16px;
                  border: none;
                  border-radius: 4px;
                  background: #666;
                  color: white;
                  cursor: pointer;
              ">Cancel</button>
              <button id="connectServer" style="
                  padding: 8px 16px;
                  border: none;
                  border-radius: 4px;
                  background: #4CAF50;
                  color: white;
                  cursor: pointer;
              ">Connect</button>
          </div>
      `;
        this.connectionModal.appendChild(content);
        // Add event listeners
        const connectButton = this.connectionModal.querySelector('#connectServer');
        const cancelButton = this.connectionModal.querySelector('#cancelConnection');
        const urlInput = this.connectionModal.querySelector('#serverUrlInput');
        const connectionType = this.connectionModal.querySelector('#connectionType');
        // Update connection type change handler
        connectionType === null || connectionType === void 0 ? void 0 : connectionType.addEventListener('change', () => {
            const isWebRTC = connectionType.value === 'webrtc';
            urlInput.placeholder = isWebRTC ?
                "Enter WebRTC server address" :
                "Enter Socket.IO server URL";
            urlInput.value = isWebRTC ?
                "wss://localhost:8080" :
                "https://localhost:3000";
        });
        connectButton === null || connectButton === void 0 ? void 0 : connectButton.addEventListener('click', () => {
            const serverUrl = urlInput.value.trim();
            if (serverUrl) {
                this.hideConnectionModal();
                this.isWebRTCMode = connectionType.value === 'webrtc';
                this.connectToServer(serverUrl);
            }
        });
        cancelButton === null || cancelButton === void 0 ? void 0 : cancelButton.addEventListener('click', () => {
            this.hideConnectionModal();
        });
        // Load saved server IP if available
        const savedIP = localStorage.getItem('lastServerIP');
        if (savedIP && urlInput) {
            urlInput.value = savedIP;
        }
        document.body.appendChild(this.connectionModal);
    }
    // Add method to show modal
    showConnectionModal() {
        if (!this.connectionModal) {
            this.createConnectionModal();
        }
        if (this.connectionModal) {
            this.connectionModal.style.display = 'block';
        }
    }
    // Add method to hide modal
    hideConnectionModal() {
        if (this.connectionModal) {
            this.connectionModal.style.display = 'none';
        }
    }
    // Add method to handle server connection
    connectToServer(serverUrl) {
        try {
            if (this.isWebRTCMode) {
                // Connect using WebRTC
                this.signalingClient = new SignalingClient(serverUrl);
                this.signalingClient.onOpen(() => {
                    console.log('Connected to WebRTC server');
                    // Create mock socket for compatibility
                    this.socket = {
                        id: null, // Will be set after authentication
                        emit: (event, data) => {
                            var _a;
                            console.log('Emitting via WebRTC:', event, data);
                            (_a = this.signalingClient) === null || _a === void 0 ? void 0 : _a.send({
                                type: event,
                                data: data
                            });
                        },
                        on: (event, handler) => {
                            console.log('Registering WebRTC handler for:', event);
                            // Store handler to be called from setupWebRTCHandlers
                            this.socketHandlers.set(event, handler);
                        },
                        disconnect: () => {
                            var _a;
                            (_a = this.signalingClient) === null || _a === void 0 ? void 0 : _a.close();
                        }
                    };
                    this.setupWebRTCHandlers();
                    this.authenticate();
                });
                this.signalingClient.onError((error) => {
                    var _a;
                    console.error('WebRTC connection error:', error);
                    alert('Failed to connect to WebRTC server. Please check the URL and try again.');
                    (_a = this.signalingClient) === null || _a === void 0 ? void 0 : _a.close();
                });
                this.signalingClient.connect();
            }
            else {
                // Connect using Socket.IO
                this.socket = esm_lookup(serverUrl, {
                    secure: true,
                    rejectUnauthorized: false,
                    withCredentials: true
                });
                this.socket.on('connect', () => {
                    console.log('Connected to Socket.IO server');
                    this.setupSocketListeners();
                    this.authenticate();
                    localStorage.setItem('lastServerIP', serverUrl);
                    this.initializeGame();
                });
                this.socket.on('connect_error', (error) => {
                    var _a;
                    console.error('Socket.IO connection error:', error);
                    alert('Failed to connect to server. Please check the URL and try again.');
                    (_a = this.socket) === null || _a === void 0 ? void 0 : _a.disconnect();
                });
            }
        }
        catch (error) {
            console.error('Error connecting to server:', error);
            alert('Failed to connect to server. Please try again.');
        }
    }
    // Add new method to initialize game
    initializeGame() {
        // Hide title screen and show game UI
        this.hideTitleScreen();
        this.showExitButton();
        // Start game loop if not already running
        if (!this.gameLoopId) {
            this.gameLoop();
        }
        // Initialize chat for multiplayer
        if (!this.isSinglePlayer) {
            this.initializeChat();
        }
    }
    // Add method to set up WebRTC handlers
    setupWebRTCHandlers() {
        if (!this.signalingClient)
            return;
        this.signalingClient.onMessage((message) => {
            console.log('WebRTC message received:', message);
            if (message.type === 'server_message') {
                message = message.data; // Unwrap server message
            }
            switch (message.type) {
                case 'authenticated':
                    this.handleWebRTCAuthentication(message.data);
                    break;
                case 'gameState':
                    this.handleWebRTCGameState(message.data);
                    break;
                case 'playerJoined':
                    this.handleWebRTCPlayerJoined(message.data);
                    break;
                // Add other message handlers as needed
            }
        });
    }
    // Add WebRTC message handlers
    handleWebRTCAuthentication(data) {
        console.log('WebRTC authentication successful');
        if (data.playerId) {
            this.socket = {
                id: data.playerId,
                emit: (event, data) => {
                    var _a;
                    (_a = this.signalingClient) === null || _a === void 0 ? void 0 : _a.send({
                        type: event,
                        data: data
                    });
                },
                on: () => { } // Stub for compatibility
            };
            // Initialize game state
            if (data.gameState) {
                this.players = new Map(Object.entries(data.gameState.players));
                this.enemies = new Map(Object.entries(data.gameState.enemies));
                this.items = data.gameState.items;
                this.obstacles = data.gameState.obstacles;
                this.decorations = data.gameState.decorations;
                this.sands = data.gameState.sands;
            }
            this.initializeGame();
        }
    }
    handleWebRTCGameState(data) {
        // Update game state from WebRTC server
        this.players = new Map(Object.entries(data.players));
        this.enemies = new Map(Object.entries(data.enemies));
        this.items = data.items;
    }
    handleWebRTCPlayerJoined(player) {
        this.players.set(player.id, Object.assign(Object.assign({}, player), { imageLoaded: true, score: 0, velocityX: 0, velocityY: 0, health: this.PLAYER_MAX_HEALTH }));
    }
}

;// ./src/auth_ui.ts
var auth_ui_awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class AuthUI {
    constructor() {
        // Get DOM elements
        this.authContainer = document.getElementById('authContainer');
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        // Login elements
        this.loginButton = document.getElementById('loginButton');
        this.loginUsername = document.getElementById('loginUsername');
        this.loginPassword = document.getElementById('loginPassword');
        // Register elements
        this.registerButton = document.getElementById('registerButton');
        this.registerOfflineButton = document.getElementById('registerOfflineButton');
        this.registerUsername = document.getElementById('registerUsername');
        this.registerPassword = document.getElementById('registerPassword');
        this.registerConfirmPassword = document.getElementById('registerConfirmPassword');
        this.serverIPInput = document.getElementById('serverIP');
        // Set default server URL
        this.serverIPInput.value = 'https://localhost:3000';
        this.serverUrl = this.serverIPInput.value;
        // Form switch elements
        this.showRegisterLink = document.getElementById('showRegister');
        this.showLoginLink = document.getElementById('showLogin');
        // Bind event listeners
        this.loginButton.addEventListener('click', () => this.handleLogin());
        this.registerButton.addEventListener('click', () => this.handleRegister());
        this.registerOfflineButton.addEventListener('click', () => this.handleOfflineRegister());
        this.showRegisterLink.addEventListener('click', () => this.toggleForms());
        this.showLoginLink.addEventListener('click', () => this.toggleForms());
        // Add server IP change listener
        this.serverIPInput.addEventListener('change', () => {
            this.serverUrl = this.serverIPInput.value;
            // Store the server URL for future use
            localStorage.setItem('serverUrl', this.serverUrl);
        });
        // Load saved server URL if exists
        const savedServerUrl = localStorage.getItem('serverUrl');
        if (savedServerUrl) {
            this.serverUrl = savedServerUrl;
            this.serverIPInput.value = savedServerUrl;
        }
        // Check for stored credentials
        this.checkStoredCredentials();
    }
    toggleForms() {
        this.loginForm.classList.toggle('hidden');
        this.registerForm.classList.toggle('hidden');
        // Update server URL when switching to login
        if (!this.loginForm.classList.contains('hidden')) {
            this.serverUrl = this.serverIPInput.value;
        }
    }
    handleLogin() {
        return auth_ui_awaiter(this, void 0, void 0, function* () {
            const username = this.loginUsername.value;
            const password = this.loginPassword.value;
            // Use the server URL from the input field even during login
            this.serverUrl = this.serverIPInput.value;
            const serverUrl = this.serverIPInput.value || this.serverUrl;
            try {
                // Try server authentication first
                const response = yield fetch(`${serverUrl}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                    credentials: 'include'
                });
                if (response.ok) {
                    // Store credentials and server URL locally
                    localStorage.setItem('username', username);
                    localStorage.setItem('password', password);
                    localStorage.setItem('currentUser', username);
                    localStorage.setItem('serverUrl', serverUrl);
                    sessionStorage.removeItem('isOffline'); // Clear any offline status
                    this.hideAuthForm();
                }
                else {
                    // Check offline credentials in sessionStorage
                    const offlineCredentials = JSON.parse(sessionStorage.getItem('offlineCredentials') || '{}');
                    if (offlineCredentials.username === username &&
                        offlineCredentials.password === password &&
                        offlineCredentials.isOffline) {
                        sessionStorage.setItem('currentUser', username);
                        sessionStorage.setItem('isOffline', 'true');
                        this.hideAuthForm();
                    }
                    else {
                        alert('Invalid username or password');
                    }
                }
            }
            catch (error) {
                console.error('Login error:', error);
                // Check offline credentials on server error
                const offlineCredentials = JSON.parse(sessionStorage.getItem('offlineCredentials') || '{}');
                if (offlineCredentials.username === username &&
                    offlineCredentials.password === password &&
                    offlineCredentials.isOffline) {
                    sessionStorage.setItem('currentUser', username);
                    sessionStorage.setItem('isOffline', 'true');
                    this.hideAuthForm();
                }
                else {
                    alert('Invalid username or password');
                }
            }
        });
    }
    handleRegister() {
        return auth_ui_awaiter(this, void 0, void 0, function* () {
            const username = this.registerUsername.value;
            const password = this.registerPassword.value;
            const confirmPassword = this.registerConfirmPassword.value;
            const serverUrl = prompt('Enter server IP address');
            alert(serverUrl);
            if (!serverUrl) {
                alert('Please enter a server IP address');
                return;
            }
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            try {
                // Try server registration first
                const response = yield fetch(`${serverUrl}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                    credentials: 'include'
                });
                if (response.ok) {
                    // Store credentials locally as backup
                    const storedCredentials = this.getStoredCredentials();
                    storedCredentials.push({ username, password });
                    localStorage.setItem('credentials', JSON.stringify(storedCredentials));
                    localStorage.setItem('serverUrl', serverUrl);
                    // Switch to login form
                    this.toggleForms();
                    alert('Registration successful! Please login.');
                }
                else {
                    const errorData = yield response.json();
                    alert(errorData.message || 'Registration failed');
                }
            }
            catch (error) {
                console.error('Registration error:', error);
                alert('Could not connect to server. Please check the server IP and try again.');
            }
        });
    }
    handleOfflineRegister() {
        return auth_ui_awaiter(this, void 0, void 0, function* () {
            const username = this.registerUsername.value;
            const password = this.registerPassword.value;
            const confirmPassword = this.registerConfirmPassword.value;
            if (!username || !password) {
                alert('Username and password are required');
                return;
            }
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            // Check if username exists in temporary storage
            const storedCredentials = this.getStoredCredentials();
            if (storedCredentials.some(cred => cred.username === username)) {
                alert('Username already exists locally');
                return;
            }
            // Store credentials in sessionStorage (temporary)
            const offlineCredentials = {
                username,
                password,
                isOffline: true
            };
            // Store in sessionStorage (temporary) instead of localStorage
            sessionStorage.setItem('offlineCredentials', JSON.stringify(offlineCredentials));
            sessionStorage.setItem('currentUser', username);
            sessionStorage.setItem('isOffline', 'true');
            // Switch to login form
            this.toggleForms();
            alert('Offline registration successful! Note: This account is temporary and will be lost when you close the browser.');
        });
    }
    getStoredCredentials() {
        const stored = localStorage.getItem('credentials');
        return stored ? JSON.parse(stored) : [];
    }
    checkStoredCredentials() {
        // Check if user is logged in offline
        const isOffline = sessionStorage.getItem('isOffline');
        if (isOffline) {
            const currentUser = sessionStorage.getItem('currentUser');
            const offlineCredentials = JSON.parse(sessionStorage.getItem('offlineCredentials') || '{}');
            if (currentUser && offlineCredentials.username === currentUser) {
                this.hideAuthForm();
                return;
            }
        }
        // Check online credentials
        const currentUser = localStorage.getItem('currentUser');
        const username = localStorage.getItem('username');
        const password = localStorage.getItem('password');
        if (currentUser && username && password) {
            this.verifyStoredCredentials(username, password).then(valid => {
                if (valid) {
                    this.hideAuthForm();
                }
                else {
                    this.logout();
                }
            });
        }
    }
    verifyStoredCredentials(username, password) {
        return auth_ui_awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${this.serverUrl}/auth/verify`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                    credentials: 'include'
                });
                return response.ok;
            }
            catch (error) {
                console.error('Verification error:', error);
                return false;
            }
        });
    }
    hideAuthForm() {
        this.authContainer.classList.add('hidden');
    }
    showAuthForm() {
        this.authContainer.classList.remove('hidden');
    }
    logout() {
        // Clear both localStorage and sessionStorage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('username');
        localStorage.removeItem('password');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('offlineCredentials');
        sessionStorage.removeItem('isOffline');
        // Attempt server logout only if not offline
        if (!sessionStorage.getItem('isOffline')) {
            fetch(`${this.serverUrl}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            }).catch(error => {
                console.error('Logout error:', error);
            });
        }
        this.showAuthForm();
    }
}

;// ./src/index.ts
// ... (keep the existing imports and Player class)


// Initialize auth UI
const authUI = new AuthUI();
let currentGame = null;
window.onload = () => {
    const singlePlayerButton = document.getElementById('singlePlayerButton');
    const multiPlayerButton = document.getElementById('multiPlayerButton');
    singlePlayerButton === null || singlePlayerButton === void 0 ? void 0 : singlePlayerButton.addEventListener('click', () => {
        if (currentGame) {
            // Cleanup previous game
            currentGame.cleanup();
        }
        currentGame = new Game(true);
    });
    multiPlayerButton === null || multiPlayerButton === void 0 ? void 0 : multiPlayerButton.addEventListener('click', () => {
        if (currentGame) {
            // Cleanup previous game
            currentGame.cleanup();
        }
        currentGame = new Game(false);
    });
};
// Add this at the top of index.ts, before the Game class

/******/ })()
;