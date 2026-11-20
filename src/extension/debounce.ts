/** Runs an action once things have been quiet for `delayMs`; each new request restarts the wait. */
export class Debouncer {
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly delayMs: number) {}

  schedule(action: () => void): void {
    this.cancel();
    this.timer = setTimeout(action, this.delayMs);
  }

  cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
