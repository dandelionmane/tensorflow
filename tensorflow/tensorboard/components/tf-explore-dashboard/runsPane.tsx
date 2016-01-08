interface RunsProps {
  dispatcher: Dispatcher;
  runsStore: RunsStore;
}

interface RunsState {
  runs: string[];
}

var RunsPane = React.createClass<RunsProps, RunsState>({
  getInitialState: function() {
    return {runs: this.props.runsStore.runs};
  },
  componentWillMount: function() {
    this.props.runsStore.registerListener(this);
  },
  notify: function(rs: RunsStore) {
    this.setState({runs: rs.runs});
  },
  render: function() {

    var createRunRow = (run, idx) => {
      return (
        <div className="run-link" key={run}>
          <div className="swatch"/>
          {run}
        </div>
      )
    }
    return <div>{this.state.runs.map(createRunRow)}</div>;
  }
});
