
interface Run {
  name: string;
  isActive: boolean;
}

class RunsStore {
  public runs: Run[];
  public dependentViews: any[];

  constructor(runNames: string[], dependentViews: any[]) {
    this.runs = runNames.map((n) => {
      return {name: n, isActive: true};
    })
    this.dependentViews = dependentViews;
    this.updateState();
  }

  private updateState() {
    this.dependentViews.forEach(v => {
      v.setState({"runs": this.runs});
    });
  }

  public toggleRun(run: string) {
    var r = this.runs.filter((r) => r.name === run)[0];
    r.isActive = !r.isActive;
    this.updateState();
  }

  public addRun(name: string) {
    this.runs.push({name: name, isActive: true});
    this.updateState();
  }
}
