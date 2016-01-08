interface Listener {
  notify: (s: Store) => void;
}

class Store {
  private listeners: Listener[];

  constructor() {
    this.listeners = [];
  }

  public registerListener(listener: Listener) {
    this.listeners.push(listener);
  }

  protected updateState() {
    this.listeners.forEach((l: Listener) => l.notify(this));
  }
}
