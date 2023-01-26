export class DebounceRunner {
    private timer: any = null;
    runDebounced(debounced: (() => void), timeout = 350): void {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(debounced, timeout);
    }
}