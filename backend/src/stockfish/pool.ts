import { StockfishWorker, StockfishOptions } from './worker';
import { config } from '../config';

interface QueueItem {
  fen: string;
  opts: StockfishOptions;
  priority: 'high' | 'low';
  resolve: (move: string | null) => void;
  reject: (err: Error) => void;
}

export class StockfishPool {
  private workers: StockfishWorker[] = [];
  private queue: QueueItem[] = [];

  constructor(poolSize = config.stockfishPoolSize) {
    for (let i = 0; i < poolSize; i++) {
      this.workers.push(new StockfishWorker(config.stockfishBinaryPath));
    }
  }

  getEvaluation(fen: string, depth: number, priority: 'high' | 'low' = 'low'): Promise<{ bestMove: string | null; cpScore: number }> {
    return new Promise((resolve, reject) => {
      const idle = this.workers.find(w => !w.busy);
      if (idle) {
        idle.getEvaluation(fen, depth).then(resolve).catch(reject);
      } else {
        // Queue as a getBestMove item with eval semantics by wrapping resolve/reject
        const evalItem = {
          fen,
          opts: { depth, skillLevel: 20 },
          priority,
          resolve: (move: string | null) => resolve({ bestMove: move, cpScore: 0 }),
          reject,
        } as QueueItem;
        if (priority === 'high') {
          this.queue.unshift(evalItem);
        } else {
          this.queue.push(evalItem);
        }
      }
    });
  }

  getBestMove(
    fen: string,
    opts: StockfishOptions,
    priority: 'high' | 'low' = 'high'
  ): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const item: QueueItem = { fen, opts, priority, resolve, reject };
      const idle = this.workers.find(w => !w.busy);
      if (idle) {
        this.dispatch(idle, item);
      } else {
        // High priority at front, low priority at back
        if (priority === 'high') {
          this.queue.unshift(item);
        } else {
          this.queue.push(item);
        }
      }
    });
  }

  private dispatch(worker: StockfishWorker, item: QueueItem) {
    worker.getBestMove(item.fen, item.opts)
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        const next = this.queue.shift();
        if (next) this.dispatch(worker, next);
      });
  }

  destroy() {
    this.workers.forEach(w => w.destroy());
  }
}

export const stockfishPool = new StockfishPool();
