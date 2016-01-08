interface RunsProps {
  dispatcher: Dispatcher;
}


var colorScale = function(x) {
  return x;
}

interface RunsState {
  runs: Run[];
}

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


var RunsPane = React.createClass<RunsProps, RunsState>({
  getInitialState: function() {
    return {runs: []};
  },
  clickFn: function(x) {
    console.log(x);
    this.props.dispatcher.toggleActive(x);
  },
  render: function() {

    var createRunRow = (run, idx) => {
      var color = colorScale(run.name);
      var style = {backgroundColor: color, color: color, width: 10, height: 10};
      var isActive = run.isActive ? "active" : "deactivated";
      var boundClick = this.clickFn.bind(this, run.name);
      return <div className="run-link" onClick={boundClick} key={run.name}> <div className="swatch" style={style}/> {run.name}</div>;
    }
    return <div>{this.state.runs.map(createRunRow)}</div>;
  }
});

setTimeout(function() {
  var runNames = ["black", "blue", "orange"];
  var dispatcher = new Dispatcher();
  var runsView = ReactDOM.render(<RunsPane dispatcher={dispatcher}/>, document.querySelector(".runs .panel-list"));
  var runsStore = new RunsStore(runNames, [runsView]);
  dispatcher.runsStore = runsStore;
  setTimeout(function() {
    runsStore.addRun("teal");
    runsStore.addRun("magenta");
  }, 1000);
}, 1500)
