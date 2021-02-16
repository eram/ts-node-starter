import { CustomError, env, POJO, Logger } from "../../utils";

type Dest = number | "bcast" | "master";                                    // destination worker.id
type Msg = "apm" | "healthcheck" | "ping" | "pong" | "require" | "signal";  // see master.ts for details
export const PKT_TOPIC = "cluster-bridge";

// user data
export class PktData {
  [key: string]: POJO | number | string;
  msg: Msg;
  error?: string;                         // user response error
}

type Callback = (data: PktData, reply: (data: PktData) => void) => boolean;
export class BridgeError extends CustomError { }

// transport object
export class Packet<T extends PktData = PktData> {
  private static _cnt = (process.pid % 1000) * 10000;
  readonly _topic = PKT_TOPIC;
  _error?: string;                        // transport error

  constructor(
    public readonly _source: Dest,        // source worker.id
    public readonly _dest: Dest,          // destination worker.id
    public readonly _data: T,             // user data
    public readonly _shouldReply = true,  // on send = ture; on post = false
    public readonly _pktId = ++Packet._cnt,
  ) { }
}

// transport mechanism for packets
interface IPort {
  readonly clientId: Dest;                // my worker.id, 'master'
  send: (packat: Packet) => void;
  onPkt: (cb: (packet: Packet) => void) => void;
}

export class Bridge {

  private readonly _pendingReplies = new Map<number, { resolve: (value: PktData) => void; reject: (reason: BridgeError) => void }>();
  private readonly _callbacks = new Array<Callback>();
  private readonly _defTimeout = env.isDebugging ? 0 : 2000;

  constructor(private readonly _port: IPort, private readonly _log: Logger) {

    _port.onPkt((packet: Packet) => {
      // this is called when a packet arrives at the client/master
      if (!packet || !packet._topic || packet._topic !== PKT_TOPIC) return;
      const pending = this._pendingReplies.get(packet._pktId);
      if (!pending) {
        // dispatch request
        delete packet._error;
        delete packet._data.error;
        _log.assert(!!this._callbacks.length, "no callbacks defined on Dispatcher");
        if (this._callbacks.length) {
          const handled = this._callbacks.some(cb => cb(packet._data, this._reply(packet)));
          if (!handled) {
            this._reply(packet)({
              msg: packet._data.msg,
              error: `${packet._data.msg} unknown`,
            });
          }
        }
      } else {
        // complete response
        this._pendingReplies.delete(packet._pktId);
        // cluster-bridge error
        if (packet._error) {
          pending.reject(new BridgeError(packet._error));
        } else if (packet._data.error) {
          // user error
          pending.resolve(packet._data);
        } else {
          // success
          pending.resolve(packet._data);
        }
      }
    });
  }


  public addCallback(cb: Callback) {
    this._callbacks.push(cb);
  }


  public removeCallback(cb?: Callback) {
    // if you have a callback remove it. no callback: remove all.
    const idx = cb ? this._callbacks.indexOf(cb) : 0;
    const length = cb ? (idx < 0 ? 0 : 1) : this._callbacks.length;
    this._callbacks.splice(idx, length);
    return idx >= 0;
  }


  public async send(data: Msg | PktData, to: Dest = "master", timeout = this._defTimeout) {
    return new Promise((resolve: (data: PktData) => void, reject: (reason: BridgeError) => void) => {

      if (typeof data === "string") {
        data = { msg: data };
      }

      if (!data || !data.msg) {
        reject(new BridgeError("invalid data"));
        return;
      }

      const req = new Packet(this._port.clientId, to, data);
      this._pendingReplies.set(req._pktId, { resolve, reject });

      if (timeout > 0) {
        setTimeout((id) => {
          const pending = this._pendingReplies.get(id);
          if (pending) {
            this._pendingReplies.delete(req._pktId);
            pending.reject(new BridgeError(`message ${id} timeout`));
          }
        }, timeout, req._pktId);
      }

      this._log.info(`request ${req._data.msg}`, req);
      this._port.send(req);
    });
  }


  public post(data: Msg | PktData, to: Dest = "master") {

    if (typeof data === "string") {
      data = { msg: data };
    }

    if (!data || !data.msg) {
      return;
    }

    const req = new Packet(this._port.clientId, to, data, false);

    this._log.info(`post ${req._data.msg}`, req);
    this._port.send(req);
  }


  // DONT CALL THIS METHOD UNLESS YOU KNOW WHAT YOU ARE DOING!
  _injectPkt(packet: Packet) {
    if (this._callbacks.length) {
      setTimeout((naked: Bridge) => {
        const handled = naked._callbacks.some((cb) => cb(packet._data, naked._reply(packet)));
        if (!handled) {
          naked._reply(packet)({
            msg: packet._data.msg,
            error: `${packet._data.msg} unknown`,
          });
        }
      }, 0, this);
    }
  }


  private _reply(packet: Packet) {
    return (data: PktData) => {
      if (packet._shouldReply) {
        const reply = new Packet(
          packet._dest === "bcast" ? "master" : packet._dest,
          packet._source, data, false, packet._pktId);
        this._log.info(`reply ${reply._data.msg}`, reply);
        this._port.send(reply);
      }
    };
  }
}

