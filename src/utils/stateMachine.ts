//
// State Machine module
// TypeScript finite state machine class with async transformations.
//

type TCB = (...args: unknown[]) => Promise<void>;

export type Transition<STATE, EVENT> = {
  fromState: STATE;
  event: EVENT;
  toState: STATE;
  cb?: TCB;
};

export class StateMachine<STATE, EVENT> {

  // initalize the state-machine
  constructor(
    protected _state: STATE,
    protected _ts: Transition<STATE, EVENT>[] = [],
  ) {}

  addTransitions(transitions: Transition<STATE, EVENT>[]) {
    this._ts.push(...transitions);
    return this;
  }

  add(fromState: STATE, event: EVENT, toState: STATE, cb?: TCB) {
    this._ts.push({ fromState, event, toState, cb });
    return this;
  }

  get state() { return this._state; }

  can(event: EVENT): boolean {
    return this._ts.some((trans) => (trans.fromState === this._state && trans.event === event));
  }

  isFinal(): boolean {
    // search for a transition that starts from current state.
    // if none is found it's a terminal state.
    return this._ts.every((trans) => (trans.fromState !== this._state));
  }

  // post event asynch
  async dispatch(event: EVENT, ...args: unknown[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {

      // delay execution to make it async
      setImmediate(() => {

        // find transition
        const found = this._ts.some(t => {
          if (t.fromState === this._state && t.event === event) {
            this._state = t.toState;
            if (t.cb) {
              try {
                t.cb(args)
                  .then(resolve)
                  .catch(reject);
              } catch (e: unknown) {
                console.error("Exception caught in callback", e);
                reject();
              }
            } else {
              resolve();
            }
            return true;
          }
          return false;
        });

        // no such transition
        if (!found) {
          console.error(`no transition: from ${this._state.toString()} event ${event.toString()}`);
          reject();
        }
      });
    });
  }
}
