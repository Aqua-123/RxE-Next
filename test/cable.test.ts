import { afterEach, describe, expect, test } from "bun:test";
import { adoptTransport, cable, hookSocket } from "../src/platform/cable";

type Handler = ((event: MessageEvent) => void) | null;

/** Mimics the parts of WebSocket that AnyCable touches: an `onmessage` accessor and `send`. */
class FakeSocket {
  #onmessage: Handler = null;
  readonly sent: unknown[] = [];
  readonly listeners: Array<(event: Event) => void> = [];

  get onmessage(): Handler {
    return this.#onmessage;
  }
  set onmessage(handler: Handler) {
    this.#onmessage = handler;
  }
  send(data: unknown) {
    this.sent.push(data);
  }
  addEventListener(_type: string, listener: (event: Event) => void) {
    this.listeners.push(listener);
  }
  removeEventListener(_type: string, listener: (event: Event) => void) {
    this.listeners.splice(this.listeners.indexOf(listener), 1);
  }
  /** Delivers a frame the way the browser does: native slot first, then listeners. */
  receive(data: string) {
    const event = new MessageEvent("message", { data });
    this.#onmessage?.call(this, event);
    this.listeners.forEach((listener) => listener(event));
  }
}

const roomFrame = (message: object) =>
  JSON.stringify({
    identifier: JSON.stringify({ channel: "RoomChannel", room_id: "channel97" }),
    message,
  });

const speak = (message: string) =>
  JSON.stringify({
    command: "message",
    identifier: JSON.stringify({ channel: "RoomChannel", room_id: "channel97" }),
    data: JSON.stringify({ action: "speak", message, id: "channel97", mode: "channel" }),
  });

function hookedSocket() {
  const socket = new FakeSocket();
  hookSocket(socket as unknown as WebSocket);
  const received: unknown[] = [];
  socket.onmessage = (event) => received.push(JSON.parse(event.data));
  return { socket, received };
}

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));

describe("incoming frames", () => {
  test("pass through untouched without handlers", () => {
    const { socket, received } = hookedSocket();
    socket.receive(roomFrame({ messages: ["hi"], user: { id: 1 } }));
    expect(received).toEqual([JSON.parse(roomFrame({ messages: ["hi"], user: { id: 1 } }))]);
  });

  test("handler assigned after hooking still gets filtered frames", () => {
    const { socket, received } = hookedSocket();
    cleanups.push(cable.onIncoming(({ message }) => (message.user?.id === 2 ? "drop" : undefined)));
    socket.receive(roomFrame({ messages: ["spam"], user: { id: 2 } }));
    socket.receive(roomFrame({ messages: ["hello"], user: { id: 3 } }));
    expect(received).toHaveLength(1);
    expect((received[0] as { message: { user: { id: number } } }).message.user.id).toBe(3);
  });

  test("handlers can rewrite the message", () => {
    const { socket, received } = hookedSocket();
    cleanups.push(cable.onIncoming(({ message }) => ({ message: { ...message, messages: ["rewritten"] } })));
    socket.receive(roomFrame({ messages: ["original"], user: { id: 1 } }));
    expect((received[0] as { message: { messages: string[] } }).message.messages).toEqual(["rewritten"]);
  });

  test("protocol frames (ping, welcome) are never passed to handlers", () => {
    const { socket, received } = hookedSocket();
    let calls = 0;
    cleanups.push(cable.onIncoming(() => void (calls += 1)));
    socket.receive(JSON.stringify({ type: "ping", message: 1 }));
    expect(calls).toBe(0);
    expect(received).toHaveLength(1);
  });

  test("addEventListener listeners see the same verdict, and handlers run once per frame", () => {
    const { socket, received } = hookedSocket();
    let calls = 0;
    cleanups.push(cable.onIncoming(() => ((calls += 1), "drop")));
    const viaListener: unknown[] = [];
    socket.addEventListener("message", (event) => viaListener.push(event));
    socket.receive(roomFrame({ messages: ["x"], user: { id: 1 } }));
    expect(received).toHaveLength(0);
    expect(viaListener).toHaveLength(0);
    expect(calls).toBe(1);
  });

  test("a throwing handler does not break delivery", () => {
    const { socket, received } = hookedSocket();
    cleanups.push(
      cable.onIncoming(() => {
        throw new Error("boom");
      })
    );
    const error = console.error;
    console.error = () => {};
    socket.receive(roomFrame({ messages: ["x"], user: { id: 1 } }));
    console.error = error;
    expect(received).toHaveLength(1);
  });
});

describe("late adoption", () => {
  test("hooks the open socket and routes reconnects through the global constructor", () => {
    const socket = new FakeSocket();
    const transport = { ws: socket as unknown as WebSocket, Impl: class {} as unknown as typeof WebSocket };
    adoptTransport(transport);
    expect(transport.Impl).toBe(globalThis.WebSocket);
    expect(cable.attached).toBe(true);

    const received: unknown[] = [];
    socket.onmessage = (event) => received.push(event);
    cleanups.push(cable.onIncoming(() => "drop"));
    socket.receive(roomFrame({ messages: ["x"], user: { id: 1 } }));
    expect(received).toHaveLength(0);
  });
});

describe("outgoing commands", () => {
  test("handlers can rewrite speak payloads", () => {
    const { socket } = hookedSocket();
    cleanups.push(
      cable.onOutgoing((command) =>
        command.command === "message" ? { data: { ...command.data, message: "changed" } } : undefined
      )
    );
    (socket as unknown as WebSocket).send(speak("original"));
    const sent = JSON.parse(socket.sent[0] as string);
    expect(JSON.parse(sent.data).message).toBe("changed");
  });

  test("handlers can drop commands", () => {
    const { socket } = hookedSocket();
    cleanups.push(cable.onOutgoing(() => "drop"));
    (socket as unknown as WebSocket).send(speak("never sent"));
    expect(socket.sent).toHaveLength(0);
  });
});
