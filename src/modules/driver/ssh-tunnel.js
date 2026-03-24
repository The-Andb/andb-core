"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SshTunnel = void 0;
var ssh2_1 = require("ssh2");
var getLogger = require('andb-logger').getLogger;
var SshTunnel = /** @class */ (function () {
    function SshTunnel(config) {
        this.config = config;
        this.logger = getLogger({ logName: 'SshTunnel' });
        this.client = new ssh2_1.Client();
    }
    /**
     * Establishes an SSH connection and forwards traffic to the destination
     */
    SshTunnel.prototype.forward = function (destHost, destPort) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.client.on('ready', function () {
                            _this.logger.info("SSH Connection Ready. Forwarding to ".concat(destHost, ":").concat(destPort));
                            _this.client.forwardOut('127.0.0.1', 12345, // Arbitrary source port
                            destHost, destPort, function (err, stream) {
                                if (err) {
                                    _this.logger.error("ForwardOut Error: ".concat(err.message));
                                    _this.client.end();
                                    return reject(err);
                                }
                                resolve(stream);
                            });
                        });
                        _this.client.on('error', function (err) {
                            _this.logger.error("SSH Client Error: ".concat(err.message));
                            reject(err);
                        });
                        // Connect
                        try {
                            _this.client.connect({
                                host: _this.config.host,
                                port: _this.config.port,
                                username: _this.config.username,
                                password: _this.config.password,
                                privateKey: _this.config.privateKey,
                                passphrase: _this.config.passphrase,
                                readyTimeout: 20000,
                            });
                        }
                        catch (err) {
                            reject(err);
                        }
                    })];
            });
        });
    };
    SshTunnel.prototype.close = function () {
        if (this.client) {
            this.client.end();
        }
    };
    return SshTunnel;
}());
exports.SshTunnel = SshTunnel;
