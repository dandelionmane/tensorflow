
var colorScale = function(x) {
  return x;
}


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
