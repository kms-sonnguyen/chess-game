import { spawn, ChildProcess } from 'child_process';

export interface StockfishOptions {
  depth: number;
  skillLevel: number;
}

export class StockfishWorker {
  private proc: ChildProcess;
  private buffer = '';
  private resolvers: Array<(move: string | null) => void> = [];
  public busy = false;

  constructor(binaryPath: string) {
    this.proc = spawn(binaryPath);
    this.proc.stdout!.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('bestmove')) {
          const resolver = this.resolvers.shift();
          if (resolver) resolver(this.parseBestMove(line));
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
      this.resolvers.push((move) => {
        this.busy = false;
        resolve(move);
      });
      this.send(`setoption name Skill Level value ${opts.skillLevel}`);
      this.send(`position fen ${fen}`);
      this.send(`go depth ${opts.depth}`);
    });
  }

  // Returns {bestMove, cpScore} — used by analysis service to evaluate positions
  getEvaluation(fen: string, depth: number): Promise<{ bestMove: string | null; cpScore: number }> {
    return new Promise((resolve) => {
      let lastCp = 0;
      this.busy = true;

      const onData = (data: Buffer) => {
        const text = data.toString();
        for (const line of text.split('\n')) {
          const cp = this.parseCpScore(line);
          if (cp !== null) lastCp = cp;
          if (line.startsWith('bestmove')) {
            this.proc.stdout!.off('data', onData);
            this.busy = false;
            resolve({ bestMove: this.parseBestMove(line), cpScore: lastCp });
          }
        }
      };

      this.proc.stdout!.on('data', onData);
      this.send(`setoption name Skill Level value 20`);
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
    });
  }

  destroy() {
    this.proc.kill();
  }
}
