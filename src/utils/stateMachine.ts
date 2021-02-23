/*
 * StateMachine.ts
 * TypeScript finite state machine class with async transformations using promises.
 */

export interface ITransition<STATE, EVENT> {
  fromState: STATE;
  event: EVENT;
  toState: STATE;
  cb?: (...args: unknown[]) => Promise<void>;
}

export function tFrom<STATE, EVENT>(
  fromState: STATE, event: EVENT, toState: STATE,
  cb?: (...args: unknown[]) => Promise<void>): ITransition<STATE, EVENT> {
  return { fromState, event, toState, cb };
}

export class StateMachine<STATE, EVENT> {

  protected current: STATE;

  // initalize the state-machine
  constructor(
    initState: STATE,
    protected transitions: ITransition<STATE, EVENT>[] = [],
  ) {
    this.current = initState;
  }

  addTransitions(transitions: ITransition<STATE, EVENT>[]): void {
    transitions.forEach((tran) => this.transitions.push(tran));
  }

  getState(): STATE { return this.current; }

  can(event: EVENT): boolean {

    for (const trans of this.transitions) {
      if (trans.fromState === this.current && trans.event === event) {
        return true;
      }
    }

    return false;
  }

  isFinal(): boolean {
    // search for a transition that starts from current state.
    // if none is found it's a terminal state.
    for (const trans of this.transitions) {
      if (trans.fromState === this.current) {
        return false;
      }
    }

    return true;
  }

  // post event asynch
  async dispatch(event: EVENT, ...args: unknown[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {

      // delay execution to make it async
      setTimeout((me: this) => {
        let found = false;

        // find transition
        for (const tran of me.transitions) {
          if (tran.fromState === me.current && tran.event === event) {

            me.current = tran.toState;
            found = true;
            if (tran.cb) {
              try {
                tran.cb(args)
                  .then(resolve)
                  .catch(reject);
              } catch (e: unknown) {
                console.error("Exception caught in callback", e);
                reject();
              }
            } else {
              resolve();
            }
            break;
          }
        }

        // no such transition
        if (!found) {
          console.error(`no transition: from ${me.current.toString()} event ${event.toString()}`);
          reject();
        }
      }, 0, this);
    });

  }
}
