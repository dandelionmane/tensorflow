interface TagChartProps {
  name: string;
}

interface TagChartState {
}
console.log("chart");

var TagChart = React.createClass<TagChartProps, TagChartState>({
  render: function() {
    return <div>Chart</div>;
  }
});
