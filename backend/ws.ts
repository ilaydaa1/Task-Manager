// deno-lint-ignore-file
// @ts-nocheck

import { Hono } from "jsr:@hono/hono";

export const wsRoute = new Hono();

// Bağlı WebSocket client'larını burada tutacağız
const clients = new Set<WebSocket>();

// Diğer dosyalardan çağıracağımız broadcast fonksiyonu
export function broadcastTaskUpdate(payload: any) {
  const msg = JSON.stringify(payload);

  for (const socket of clients) {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(msg);
      }
    } catch (_e) {
      // sessizce ignore et
    }
  }
}

// /api/ws → WebSocket endpoint
wsRoute.get("/", (c) => {
  const { socket, response } = Deno.upgradeWebSocket(c.req.raw);

  socket.onopen = () => {
    clients.add(socket);
    console.log("WS connected. Total:", clients.size);
  };

  socket.onclose = () => {
    clients.delete(socket);
    console.log("WS closed. Total:", clients.size);
  };

  socket.onerror = () => {
    clients.delete(socket);
    console.log("WS error. Total:", clients.size);
  };

  return response;
});
