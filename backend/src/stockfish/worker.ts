import { spawn, ChildProcess } from 'child_process';

export interface StockfishOptions {
  depth: number;
  skillLevel: number;
}

export class StockfishWorker {
  private proc: ChildProcess;
  private buffer = '';
  private moveResolvers: Array<(move: string | null) => void> = [];
  private evalResolvers: Array<(result: { bestMove: string | null; cpScore: number }) => void> = [];
  private lastCp = 0;
  public busy = false;

  constructor(binaryPath: string) {
    this.proc = spawn(binaryPath);
    this.proc.stdout!.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() ?? '';
      for (const line of lines) {
        // Track cp score from info lines
        const cp = this.parseCpScore(line);
        if (cp !== null) this.lastCp = cp;

        if (line.startsWith('bestmove')) {
          this.busy = false;
          // Eval resolvers take priority (they're first in queue)
          const evalResolver = this.evalResolvers.shift();
          if (evalResolver) {
            evalResolver({ bestMove: this.parseBestMove(line), cpScore: this.lastCp });
          } else {
            const moveResolver = this.moveResolvers.shift();
            if (moveResolver) moveResolver(this.parseBestMove(line));
          }
        }
      }
    });
    this.send('uci');
    this.send('isready');
  }

  private send(cmd: string) {
    this.proc.stdin!.write(cmd + '\n');
  }

  parseBestMove(line: string): string | null {
    const match = line.match(/^bestmove (\S+)/);
    if (!match || match[1] === '(none)') return null;
    return match[1];
  }

  parseCpScore(line: string): number | null {
    const match = line.match(/score cp (-?\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  getBestMove(fen: string, opts: StockfishOptions): Promise<string | null> {
    return new Promise((resolve) => {
      this.busy = true;
      this.lastCp = 0;
      this.moveResolvers.push(resolve);
      this.send(`setoption name Skill Level value ${opts.skillLevel}`);
      this.send(`position fen ${fen}`);
      this.send(`go depth ${opts.depth}`);
    });
  }

  getEvaluation(fen: string, depth: number): Promise<{ bestMove: string | null; cpScore: number }> {
    return new Promise((resolve) => {
      this.busy = true;
      this.lastCp = 0;
      this.evalResolvers.push(resolve);
      this.send(`setoption name Skill Level value 20`);
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
    });
  }

  destroy() {
    this.proc.kill();
  }
}
