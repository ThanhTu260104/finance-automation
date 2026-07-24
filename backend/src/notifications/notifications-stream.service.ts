import { Injectable, MessageEvent } from '@nestjs/common';
import { interval, map, merge, Observable, of, Subject } from 'rxjs';

@Injectable()
export class NotificationsStreamService {
  private readonly streams = new Map<string, Subject<MessageEvent>>();

  eventsFor(userId: string): Observable<MessageEvent> {
    const stream = this.getStream(userId);

    return merge(
      of({ type: 'connected', data: { connected: true } }),
      stream.asObservable(),
      interval(25_000).pipe(
        map(() => ({ type: 'heartbeat', data: { timestamp: Date.now() } })),
      ),
    );
  }

  publish(userId: string, notification: object) {
    this.getStream(userId).next({ type: 'notification', data: notification });
  }

  refresh(userId: string) {
    this.getStream(userId).next({ type: 'refresh', data: { refresh: true } });
  }

  broadcastProposalChange(proposalId: string, action: string) {
    const event: MessageEvent = {
      type: 'proposal-change',
      data: { proposalId, action, timestamp: Date.now() },
    };
    for (const stream of this.streams.values()) {
      stream.next(event);
    }
  }

  private getStream(userId: string) {
    let stream = this.streams.get(userId);
    if (!stream) {
      stream = new Subject<MessageEvent>();
      this.streams.set(userId, stream);
    }
    return stream;
  }
}
