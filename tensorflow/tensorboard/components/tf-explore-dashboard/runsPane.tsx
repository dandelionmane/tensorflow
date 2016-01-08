interface RunsProps {
  dispatcher: Dispatcher;
}

interface RunsState {
  runs: Run[];
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
