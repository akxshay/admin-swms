import { EventEmitter } from 'events';
import { Response } from 'express';

interface ClientConnection {
  userId: string;
  res: Response;
}

class RealtimeBusService extends EventEmitter {
  private clients: Set<ClientConnection> = new Set();

  constructor() {
    super();
    // Send keep-alive every 25 seconds to keep HTTP connections alive
    setInterval(() => {
      this.sendKeepAlive();
    }, 25000);
  }

  public registerClient(userId: string, res: Response): () => void {
    const connection: ClientConnection = { userId, res };
    this.clients.add(connection);

    // Initial greeting
    this.sendRaw(res, 'connected', { status: 'ok', time: new Date().toISOString() });

    return () => {
      this.clients.delete(connection);
    };
  }

  public emitToUser(userId: string, event: string, data: any): void {
    const payload = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.userId === userId) {
        this.sendRaw(client.res, event, payload);
      }
    }
    // Also emit internally
    this.emit(event, { userId, data });
  }

  public broadcast(event: string, data: any): void {
    const payload = JSON.stringify(data);
    for (const client of this.clients) {
      this.sendRaw(client.res, event, payload);
    }
    this.emit(event, { userId: 'ALL', data });
  }

  private sendRaw(res: Response, event: string, data: any): void {
    try {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data);
      res.write(`event: ${event}\ndata: ${serialized}\n\n`);
    } catch (err) {
      // client disconnected
    }
  }

  private sendKeepAlive(): void {
    for (const client of this.clients) {
      try {
        client.res.write(`: ping\n\n`);
      } catch (e) {
        this.clients.delete(client);
      }
    }
  }
}

export const realtimeBus = new RealtimeBusService();
