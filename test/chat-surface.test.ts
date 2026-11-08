import { beforeAll, expect, test } from "bun:test";
import { Scope } from "../src/core/scope";
import { hookSocket } from "../src/platform/cable";
import { drop, installChatSurface, scopedChat } from "../src/site/surfaces/chat";

type Handler = ((event: MessageEvent) => void) | null;

class FakeSocket {
  #onmessage: Handler = null;
  readonly sent: string[] = [];
  get onmessage(): Handler {
    return this.#onmessage;
  }
  set onmessage(handler: Handler) {
    this.#onmessage = handler;
  }
  send(data: string) {
    this.sent.push(data);
  }
  addEventListener() {}
  removeEventListener() {}
  receive(data: string) {
    this.#onmessage?.call(this, new MessageEvent("message", { data }));
  }
}

const identifier = JSON.stringify({ channel: "RoomChannel", room_id: "channel97" });
const frame = (message: object) => JSON.stringify({ identifier, message });
const user = (id: number) => ({ id, display_name: `user${id}` });

function connect() {
  const socket = new FakeSocket();
  hookSocket(socket as unknown as WebSocket);
  const received: any[] = [];
  socket.onmessage = (event) => received.push(JSON.parse(event.data).message);
  return { socket, received };
}

beforeAll(installChatSurface);

test("features see domain events and can drop them; disposing the scope removes the handler", () => {
  const scope = new Scope("test");
  scopedChat(scope).incoming((event) =>
    event.kind === "message" && event.author.id === 2 ? drop : undefined
  );
  const { socket, received } = connect();

  socket.receive(frame({ messages: ["spam"], user: user(2) }));
  socket.receive(frame({ messages: ["hello"], user: user(3) }));
  expect(received.map((message) => message.messages[0])).toEqual(["hello"]);

  scope.dispose();
  socket.receive(frame({ messages: ["back"], user: user(2) }));
  expect(received.map((message) => message.messages[0])).toEqual(["hello", "back"]);
});

test("outgoing messages can be rewritten before they are sent", () => {
  const scope = new Scope("commands");
  scopedChat(scope).outgoing((message) => ({
    ...message,
    text: message.text.replace(".shrug", "¯\\_(ツ)_/¯"),
  }));
  const { socket } = connect();

  (socket as unknown as WebSocket).send(
    JSON.stringify({
      command: "message",
      identifier,
      data: JSON.stringify({
        action: "speak",
        message: "ok .shrug",
        id: "channel97",
        mode: "channel",
      }),
    })
  );
  expect(JSON.parse(JSON.parse(socket.sent[0]!).data).message).toBe("ok ¯\\_(ツ)_/¯");
  scope.dispose();
});
