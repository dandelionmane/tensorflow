
class Dispatcher {
  public runsStore: RunsStore;

  constructor() {
  }

  public toggleActive(runName: string) {
    if (this.runsStore) {
      this.runsStore.toggleRun(runName);
    }
  }
}
