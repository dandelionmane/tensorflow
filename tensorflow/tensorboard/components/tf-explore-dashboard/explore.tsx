
var colorScale = function(x) {
  return x;
}


function main() {
  var runNames = ["black", "blue", "orange"];
  var dispatcher = new Dispatcher();
  var runsPanelElement = document.querySelector(".runs .panel-list");
  var runsStore = new RunsStore(TF.Urls.demoRouter("data"));
  var runsView = ReactDOM.render(<RunsPane runsStore={runsStore} dispatcher={dispatcher}/>, runsPanelElement);
  (window as any).runsStore = runsStore;
}

window.addEventListener('WebComponentsReady', main);
