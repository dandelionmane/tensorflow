interface TagProps {
  name: string;
  key: string;
}

interface TagState {
}

var Tag = React.createClass<TagProps, TagState>({
  render: function() {
    return (
      <div key={this.key}>
        <h4>{this.props.name}</h4>
        <TagChart name={this.props.name}/>
      </div>
    );
  }
});
