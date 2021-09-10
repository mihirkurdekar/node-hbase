/*
import * as EventEmitter from 'events';
import * as http from "http";
import * as https from "https";
import * as url from 'url';

let krb5;
try {
    krb5 = require('krb5'); // No Kerberos Support
} catch (error1) {

}

export interface ClientOptions {
    protocol?: string;
    host?: string;
    port?: string | number;
    krb5?: any;
    encoding?: string;
    path?: any;
    headers?: { key: string };
}


export interface ConnectionOptions {
    headers?: { key: string };
    protocol?: string;
    path?: any;
    hostncame?: string;
    rejectUnauthorized?: boolean
}

export class Connection {
    client: Client;
    options: ConnectionOptions;

    constructor(client: Client) {
        var options: ConnectionOptions = {};
        this.client = client;
        //  options = this.client.options;
        options.protocol = `${this.client.options.protocol}:`;
        options.hostncame = this.client.options.host;
        options.path = this.client.options.path != null ? this.client.options.path.replace(/\/$/, "") : "";
        options.headers = (this.client.options.headers) ? this.client.options.headers : null;
        options.headers['content-type'] = 'application/json';
        options.headers['Accept'] = 'application/json';
        options.rejectUnauthorized = false;
        this.options = options;
    }

    makeRequest = function (method, command, data, callback) {
        const do_async = function () {
            // Ensure events registered after connection are received
            return setImmediate(do_krb5);
        }
        const do_krb5 = () => {
            var base;
            if (this.client.krb5) {
                return do_spnego();
            }
            if (!this.client.options.krb5.principal) {
                return do_request();
            }
            if ((base = this.client.options.krb5).service_principal == null) {
                base.service_principal = `HTTP@${this.options.hostname}`;
            }
            if (!krb5) {
                return callback(Error("Module 'krb5' not installed"));
            }
            return do_spnego();
        };
        const do_spnego = () => {
            if (!(this.client.options.krb5.password || this.client.options.krb5.keytab)) {
                return do_token();
            }
            // Kinit first if password or keytab provided
            return krb5.kinit(this.client.options.krb5, function (err, ccname) {
                if (err) {
                    return callback(Error(err));
                }
                return do_token();
            });
        };
        const do_token = () => {
            return krb5.spnego(this.client.options.krb5, function (err, token) {
                var e;
                e = 'GSS error ' + err;
                if (err) {
                    return callback(Error(e));
                }
                this.options.headers['Authorization'] = 'Negotiate ' + token;
                return do_request();
            });
        };
        const do_request = () => {
            var req;
            this.client.emit('request', {
                options: this.options,
                data: data
            });
            req = http[this.client.options.protocol].request(this.options, (res) => {
                var body;
                body = '';
                res.on('data', function (chunk) {
                    return body += chunk;
                });
                res.on('end', () => {
                    var e, error;
                    error = null;
                    try {
                        body = this.handleJson(res, body);
                    } catch (error1) {
                        e = error1;
                        body = null;
                        error = e;
                    }
                    return callback(error, body, res);
                });
                return res.on('error', function (err) {
                    return callback(err);
                });
            });
            req.on('error', function (err) {
                return callback(err);
            });
            if (data && data !== '') {
                data = typeof data === 'string' ? data : JSON.stringify(data);
                req.write(data, 'utf8');
            }
            // Handle Timeout
            if (this.options.timeout) {
                req.setTimeout(this.options.timeout, function () {
                    return req.abort();
                });
            }
            // Terminate Request
            return req.end();
        };
        return do_async();
    }

    get = function (command, callback) {
        return this.makeRequest('GET', command, '', callback);
    }
    put = function (command, data, callback) {
        return this.makeRequest('PUT', command, data, callback);
    }
    post = function (command, data, callback) {
        return this.makeRequest('POST', command, data, callback);
    }
    delete = function (command, callback) {
        return this.makeRequest('DELETE', command, '', callback);
    }
    handleJson = function (response, body) {
        var e;
        switch (response.statusCode) {
            // Created
            case 201:
            case 200: // Ok
                if (body) {
                    return JSON.parse(body);
                } else {
                    return null;
                }
            default:
                e = new Error(`${response.statusCode}: ${this.codes[response.statusCode]}`);
                e.code = response.statusCode;
                e.body = body;
                throw e;
        }
    }
    codes = {
        100: 'Continue',
        101: 'Switching Protocols',
        102: 'Processing (WebDAV)',
        200: 'OK',
        201: 'Created',
        202: 'Accepted',
        203: 'Non-Authoritative Information',
        204: 'No Content',
        205: 'Reset Content',
        206: 'Partial Content',
        207: 'Multi-Status (WebDAV)',
        300: 'Multiple Choices',
        301: 'Moved Permanently',
        302: 'Found',
        303: 'See Other',
        304: 'Not Modified',
        305: 'Use Proxy',
        306: 'Switch Proxy',
        307: 'Temporary Redirect',
        400: 'Bad Request',
        401: 'Unauthorized',
        402: 'Payment Required',
        403: 'Forbidden',
        404: 'Not Found',
        405: 'Method Not Allowed',
        406: 'Not Acceptable',
        407: 'Proxy Authentication Required',
        408: 'Request Timeout',
        409: 'Conflict',
        410: 'Gone',
        411: 'Length Required',
        412: 'Precondition Failed',
        413: 'Request Entity Too Large',
        414: 'Request-URI Too Long',
        415: 'Unsupported Media Type',
        416: 'Requested Range Not Satisfiable',
        417: 'Expectation Failed',
        418: 'I\'m a teapot',
        422: 'Unprocessable Entity (WebDAV)',
        423: 'Locked (WebDAV)',
        424: 'Failed Dependency (WebDAV)',
        425: 'Unordered Collection',
        426: 'Upgrade Required',
        449: 'Retry With',
        500: 'Internal Server Error',
        501: 'Not Implemented',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Timeout',
        505: 'HTTP Version Not Supported',
        506: 'Variant Also Negotiates',
        507: 'Insufficient Storage (WebDAV)',
        509: 'Bandwidth Limit Exceeded (Apache bw/limited extension)',
        510: 'Not Extended'
    }
}

export class Row {
    client: Client;
    table: string;
    key: string;

    constructor(client: Client, table: string | Table, key: string) {
        this.client = client;
        this.table = (typeof table === "string" ? table : table.name);
        this.key = key;
    }

    get = function (column, callback) {
        var args, columns, end, isGlob, key, options, params, start, url;
        args = Array.prototype.slice.call(arguments);
        key = "/" + this.table + "/" + this.key;
        isGlob = this.key.substr(-1, 1) === "*";
        options = {};
        columns = null;
        start = null;
        end = null;
        params = {};
        if (typeof args[0] === "string" || (typeof args[0] === "object" && args[0] instanceof Array)) {
            columns = args.shift();
        }
        if (typeof args[0] === "object") {
            options = args.shift();
        }
        if (options.start) {
            start = options.start;
        }
        if (options.end) {
            end = options.end;
        }
        if (options.v) {
            params.v = options.v;
        }
        url = utils.url.encode({
            table: this.table,
            key: this.key,
            columns: columns,
            start: start,
            end: end,
            params: params
        });
        return this.client.connection.get(url, (error, data) => {
            var cells;
            if (error) {
                return args[0].apply(this, [error, null]);
            }
            cells = [];
            data.Row.forEach((row) => {
                key = utils.base64.decode(row.key, this.client.options.encoding);
                return row.Cell.forEach((cell) => {
                    data = {};
                    if (isGlob) {
                        data.key = key;
                    }
                    data.column = utils.base64.decode(cell.column, this.client.options.encoding);
                    data.timestamp = cell.timestamp;
                    data.$ = utils.base64.decode(cell.$, this.client.options.encoding);
                    return cells.push(data);
                });
            });
            return args[0].apply(this, [null, cells]);
        });
    }

    put = function (columns, values, callback) {
        var args, body, bodyCell, bodyRow, cell, cells, cellsKeys, data, k, k1, timestamps, url;
        args = Array.prototype.slice.call(arguments);
        url = void 0;
        body = void 0;
        bodyRow = void 0;
        // First argument are columns and second argument are values
        if (args.length > 2) {
            columns = args.shift();
            values = args.shift();
            timestamps = void 0;
            if (typeof args[0] !== "function") {
                timestamps = args.shift();
            }
            callback = args.shift();
            if (typeof columns === "string") {
                columns = [columns];
                values = [values];
            } else {
                if (columns.length !== values.length) {
                    throw new Error("Columns count must match values count");
                }
            }
            body = {
                Row: []
            };
            bodyRow = {
                key: utils.base64.encode(this.key, this.client.options.encoding),
                Cell: []
            };
            columns.forEach((column, i) => {
                var bodyCell;
                bodyCell = {};
                if (timestamps) {
                    bodyCell.timestamp = timestamps[i];
                }
                bodyCell.column = utils.base64.encode(column, this.client.options.encoding);
                bodyCell.$ = utils.base64.encode(values[i], this.client.options.encoding);
                return bodyRow.Cell.push(bodyCell);
            });
            body.Row.push(bodyRow);
            url = utils.url.encode({
                table: this.table,
                key: this.key || "___false-row-key___",
                columns: columns
            });
        } else {
            // First argument is a full object with columns and values
            data = args.shift();
            callback = args.shift();
            body = {
                Row: []
            };
            cellsKeys = {};
            data.forEach((d) => {
                var key;
                key = d.key || this.key;
                if (!(key in cellsKeys)) {
                    cellsKeys[key] = [];
                }
                return cellsKeys[key].push(d);
            });
            for (k in cellsKeys) {
                cells = cellsKeys[k];
                bodyRow = {
                    key: utils.base64.encode(k, this.client.options.encoding),
                    Cell: []
                };
                for (k1 in cells) {
                    cell = cells[k1];
                    bodyCell = {};
                    if (cell.timestamp) {
                        bodyCell.timestamp = "" + cell.timestamp;
                    }
                    bodyCell.column = utils.base64.encode(cell.column, this.client.options.encoding);
                    bodyCell.$ = utils.base64.encode(cell.$, this.client.options.encoding);
                    bodyRow.Cell.push(bodyCell);
                }
                body.Row.push(bodyRow);
            }
            url = utils.url.encode({
                table: this.table,
                key: this.key || "___false-row-key___",
                columns: ['test:']
            });
        }
        return this.client.connection.put(url, body, (error, data) => {
            if (!callback) {
                return;
            }
            return callback.apply(this, [error, (error ? null : true)]);
        });
    }

}

export class Scanner {
    constructor(client: Client, options: ClientOptions) {

    }
}

export class Table {
    client: Client;
    name: string;

    constructor(client: Client, name: string) {
        this.client = client;
        this.name = name;
    }

    create = function (schema, callback) {
        var args;
        args = Array.prototype.slice.call(arguments);
        schema = args.length && typeof args[0] === 'object' || typeof args[0] === 'string' ? args.shift() : {};
        callback = args.length ? args.shift() : null;
        schema.name = this.name;
        if (typeof schema === 'string') {
            schema = {
                ColumnSchema: [
                    {
                        name: schema
                    }
                ]
            };
        }
        return this.client.connection.put(`/${this.name}/schema`, schema, (error, data) => {
            if (!callback) {
                if (error) {
                    throw error;
                } else {
                    return;
                }
            }
            return callback.apply(this, [error, error ? null : true]);
        });
    }

    delete = function (callback) {
        return this.client.connection.delete(`/${this.name}/schema`, (error, data) => {
            if (!callback) {
                if (error) {
                    throw error;
                } else {
                    return;
                }
            }
            return callback.apply(this, [error, error ? null : true]);
        });
    }

    exists = function (callback) {
        return this.client.connection.get(`/${this.name}/exists`, (error, exists) => {
            if (error && error.code === 404) {
                error = null;
                exists = false;
            }
            return callback.apply(this, [error, error ? null : exists !== false]);
        });
    }

    update = function (schema, callback) {
        schema.name = this.name;
        return this.client.connection.post(`/${this.name}/schema`, schema, (error, data) => {
            if (!callback) {
                if (error) {
                    throw error;
                } else {
                    return;
                }
            }
            return callback.apply(this, [error, error ? null : true]);
        });
    }

    schema = function (callback) {
        return this.client.connection.get(`/${this.name}/schema`, (error, data) => {
            return callback.apply(this, [error, error ? null : data]);
        });
    }

    regions = function (callback) {
        return this.client.connection.get(`/${this.name}/regions`, (error, data) => {
            return callback.apply(this, [error, error ? null : data]);
        });
    }

    row = function (key): Row {
        return new Row(this.client, this.name, key);
    }

    scan = function (options, callback): Scanner {
        var chunks, scanner;
        if (arguments.length === 0) {
            options = {};
        } else if (arguments.length === 1) {
            if (typeof arguments[0] === 'function') {
                callback = options;
                options = {};
            }
        } else if (arguments.length !== 2) {
            throw Error('Invalid arguments');
        }
        options.table = this.name;
        scanner = new Scanner(this.client, options);
        if (callback) {
            chunks = [];
            scanner.on('readable', function () {
                var chunk, results;
                results = [];
                while (chunk = scanner.read()) {
                    results.push(chunks.push(chunk));
                }
                return results;
            });
            scanner.on('error', function (err) {
                return callback(err);
            });
            scanner.on('end', function () {
                return callback(null, chunks);
            });
        }
        return scanner;
    }
}

export class Client extends EventEmitter {
    connection: Connection;
    options: ClientOptions;

    constructor(options?: ClientOptions) {
        super();
        var ref;
        if (!options) {
            options = {};
        }
        EventEmitter.call(this, this.options);
        //this.emit(this, this.options);
        if (options.protocol == null) {
            options.protocol = 'http';
        }
        if (options.host == null) {
            options.host = '127.0.0.1';
        }
        if (options.port == null) {
            options.port = '8080';
        }
        if (options.krb5 == null) {
            options.krb5 = {};
        }
        if (options.encoding == null) {
            options.encoding = 'utf8';
        }
        if ((ref = options.protocol) !== 'http' && ref !== 'https') {
            throw Error(`Invalid protocol ${JSON.stringify(options.protocol)}`);
        }
        this.options = options;
        this.connection = new Connection(this);
        return this;
    }

    // Query Software Version.
    version(callback) {
        return this.connection.get("/version", callback);
    }

    // Query Storage Cluster Version.
    version_cluster(callback) {
        return this.connection.get("/version/cluster", callback);
    }

    // Query Storage Cluster Status.
    status_cluster(callback) {
        return this.connection.get("/status/cluster", callback);
    }

    // List tables.
    tables(callback) {
        return this.connection.get("/", function (err, data) {
            return callback(err, (data && data.table ? data.table : null));
        });
    }

    // Return a new instance of "hbase.Table".
    table(name) {
        return new Table(this, name);
    }
}*/
