interface EventsProps {
  dispatcher: Dispatcher;
  runsStore: RunsStore;
  dataStore: DataStore;
}

type Timestamp = number;
type Step = number;
type Value = number;

type ScalarDatum = [Timestamp, Step, Value];

type DataArray = {[key: string]: ScalarDatum[]};

interface EventsState {
  categories: Categorizer.Category[];
  tag2run: {[tag: string]: string[]};
  dataArray: DataArray;
}

interface CategoryProps {
  name: string;
  tags: string[];
}

interface CategoryState {
}

var CategoryPane = React.createClass<CategoryProps, CategoryState>({
  getInitialState: function() {
    return {
      tags: [],
      dataArray: {},
      tag2run: {},
    };
  },
  render: function() {
    return (
      <div className="group">
        <h3 key={this.props.name}>{this.props.name}</h3>
        <div className="charts">
          {this.props.tags.map(function(tag) {
            return <Tag name={tag} key={tag} />;
          })}
        </div>
      </div>
    );
  }
})

var EventsPane = React.createClass<EventsProps, EventsState>({
  getInitialState: function() {
    return {
      categories: this.props.runsStore.categories,
      tag2run: this.props.runsStore.tag2run,
      dataArray: this.props.dataStore.dataStore,
    };
  },
  componentWillMount: function() {
    this.props.runsStore.registerListener(this);
    this.props.dataStore.registerListener(this);
  },
  notify: function() {
    this.setState(this.getInitialState());
  },
  render: function() {
    var createCategoryPane = (category: Categorizer.Category) => {
      var pane = <CategoryPane tags={category.tags} name={category.name} />;
      return pane;
    }
    return <div>{this.state.categories.map(createCategoryPane)}</div>;
  }
});
