import { StateMachine } from "./stateMachine";

//
// state machine usage example here
//
enum States { closing = 0, closed, opening, open, breaking, broken }
enum Events { open = 100, openComplete, close, closeComplete, break, breakComplete }

class Door extends StateMachine<States, Events> {

  private readonly _id = `Door${(Math.floor(Math.random() * 10000))}`;

  // ctor
  constructor(init: States = States.closed) {

    super(init);

    const s = States;
    const e = Events;

    /* eslint-disable no-multi-spaces */
    this
      //   fromState    event            toState      callback
      .add(s.closed,    e.open,          s.opening,   this._onOpen)
      .add(s.opening,   e.openComplete,  s.open,      this._justLog)
      .add(s.open,      e.close,         s.closing,   this._onClose)
      .add(s.closing,   e.closeComplete, s.closed,    this._justLog)
      .add(s.open,      e.break,         s.breaking,  this._onBreak)
      .add(s.breaking,  e.breakComplete, s.broken)
      .add(s.closed,    e.break,         s.breaking,  this._onBreak)
      .add(s.breaking,  e.breakComplete, s.broken);
    /* eslint-enable no-multi-spaces */
  }

  // public methods
  async open() { return this.dispatch(Events.open); }
  async close() { return this.dispatch(Events.close); }
  async break() { return this.dispatch(Events.break); }

  isBroken(): boolean { return this.isFinal(); }
  isOpen(): boolean { return this.state === States.open; }

  // transition callbacks
  private _onOpen = async () => {
    console.log(`${this._id} onOpen...`);
    return this.dispatch(Events.openComplete);
  };

  private _onClose = async () => {
    console.log(`${this._id} onClose...`);
    return this.dispatch(Events.closeComplete);
  };

  private _onBreak = async () => {
    console.log(`${this._id} onBreak...`);
    return this.dispatch(Events.breakComplete);
  };

  private _justLog = async () => {
    console.log(`${this._id} ${States[this.state]}`);
    return Promise.resolve();
  };
}

describe("stateMachine tests", () => {

  test("transition ok", async () => {
    // test opening a closed door
    const door = new Door();
    expect(door.isOpen()).toBeFalsy();
    expect(door.isBroken()).toBeFalsy();
    expect(door.can(Events.open)).toBeTruthy();
    await door.open();
    expect(door.isOpen()).toBeTruthy();
  });

  test("cannot transition from a state to itself, reject it tried", async () => {
    // test open an opened door
    const door = new Door(States.open);
    expect(door.can(Events.open)).toBeFalsy();
    await expect(door.open()).rejects.toBeUndefined();
  });

  test("transition to final state", async () => {
    // test closing an open door
    const door = new Door(States.open);
    expect(door.isOpen()).toBeTruthy();
    await door.close();
    expect(door.isOpen()).toBeFalsy();

    // test breaking a door gets you to a final state
    expect(door.isBroken()).toBeFalsy();
    await door.break();
    expect(door.isBroken()).toBeTruthy();
    expect(door.isFinal()).toBeTruthy();
  });

  test("cannot exit a final state", async () => {
    // broken door cannot be opened or closed
    const door = new Door(States.broken);
    expect(door.isBroken()).toBeTruthy();
    await expect(door.open()).rejects.toBeUndefined();
  });

  test("should reject making change while on intermediate state", async () => {
    // test breaking in the middle of closing
    const door = new Door(States.open);
    expect(door.isOpen()).toBeTruthy();
    const dontAwait = door.close();
    expect(door.isOpen()).toBeTruthy();
    await expect(door.break()).rejects.toBeUndefined();
    await dontAwait;  // prevent UnhandledPromiseRejection error
  });
});
