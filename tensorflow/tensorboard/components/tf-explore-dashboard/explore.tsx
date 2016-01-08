
var colorScale = function(x) {
  return x;
}


function main() {
  var runNames = ["black", "blue", "orange"];
  var dispatcher = new Dispatcher();
  var runsStore = new RunsStore(TF.Urls.demoRouter("data"));
  var dataStore = new DataStore(TF.Urls.demoRouter("data"));
  var runsPanelElement = document.querySelector(".runs .panel-list");
  var runsView = ReactDOM.render(<RunsPane runsStore={runsStore} dispatcher={dispatcher}/>, runsPanelElement);
  var browsePanelElement = document.querySelector(".browse .panel-list");
  var browsePane = <EventsPane runsStore={runsStore} dispatcher={dispatcher} dataStore={dataStore}/>;
  var browseView = ReactDOM.render(browsePane, browsePanelElement);
  (window as any).runsStore = runsStore;
  (window as any).browseView = browseView;
}

window.addEventListener('WebComponentsReady', main);
