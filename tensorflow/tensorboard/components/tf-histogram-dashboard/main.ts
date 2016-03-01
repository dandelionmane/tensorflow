var rm = new TF.Backend.RequestManager();
var backend = new TF.Backend.Backend("/components/tf-tensorboard/demo/giant_data", rm, true);

function makeHistogramDashboard(el: HTMLElement, elScope: any) {

  var data = [];

  //
  // Elements
  //
  var actionsPanel = elScope.$.actions;
  var chartsContainer: d3.Selection<HCategory> = d3.select(el);
  var frame = elScope.$.frame;
  var scrollContainer = document.querySelector("#mainContainer");

  var chartMode = "offset";
  var chartTime = "i";

  //
  // Chart sizing
  //
  var frameWidth;
  var frameHeight;
  var scrollContainerHeight;
  var scrollContainerTop;
  var scrollContainerBottom;
  var bufferTop;
  var bufferBottom;
  var chartWidth;
  var chartHeight;

  var numColumns = 4;
  var chartAspectRatio = 0.75;
  var lastRenderedScrollPosition = 0;

  var visibleCharts;
  var almostVisibleCharts;
  var allCharts = [];

  //
  // Scroll and Resize events
  //
  throttle("scroll", "throttledScroll", scrollContainer);
  scrollContainer.addEventListener("throttledScroll", function() {
    if (Math.abs(lastRenderedScrollPosition - scrollContainer.scrollTop) > frameHeight * 0.5) {
      console.log("scrolling");
      render();
    }
  });

  throttle("resize", "throttledResize", window);
  window.addEventListener("throttledResize", function() {
    console.log("resizing");
    render();
  });

  //
  // Events from actions panel
  //

  actionsPanel.addEventListener("zoomchange", function(e) {
    var targetY = 0;
    var previousStageHeight = data[data.length - 1].y + data[data.length - 1].height;
    var previousScrollTop = scrollContainer.scrollTop + targetY;
    numColumns = Math.max(1, (e.detail.value === "in" ? Math.floor(numColumns - 1) : Math.ceil(numColumns + 1)));
    layout();
    var newStageHeight = data[data.length - 1].y + data[data.length - 1].height;
    scrollContainer.scrollTop = previousScrollTop * (newStageHeight / previousStageHeight ) - targetY;
    render();
  });

  actionsPanel.addEventListener("modechange", function(e) {
    allCharts.forEach(function(chart) {
      mutateChart(chart, "mode", e.detail.value);
    });
    chartMode = e.detail.value;
    updateVisibleCharts(1000);
  });

  actionsPanel.addEventListener("timechange", function(e) {
    allCharts.forEach(function(chart) {
      mutateChart(chart, "time", e.detail.value);
    });
    chartTime = e.detail.value;
    updateVisibleCharts(1000);
  });

  throttle("searchchange", "throttledSearchchange", actionsPanel);
  actionsPanel.addEventListener("throttledSearchchange", function(e) {
    filter(e.detail.value);
  });

  actionsPanel.addEventListener("refresh", function(e) {
    allCharts.forEach(function(chart) {
      mutateChart(chart, "dataRequested", false);
    });
    render();
  });


  //
  // Chart method wrappers so we can keep track of dirty state.
  //
  function mutateChart(c, property, value) {
    c[property] = value;
    c.dirty = true;
  }

  function drawChart(c, animationDuration?: number) {
    c.draw(animationDuration)
    c.dirty = false
  }

  function updateVisibleCharts(animationDuration) {
    visibleCharts.each(function(d:any) {
      console.log("draw")
      drawChart(this, animationDuration);
    });
  }


  //
  // Render skeleton HTML
  //

  interface RunTag {
    run: string;
    tag: string;
  }

  interface HCategory {
    name: string;
    runTags: RunTag[];
  }

  function histogramCategories(x: TF.Backend.RunsResponse): HCategory[] {
    var enumerations = <TF.Backend.RunEnumeration[]> _.values(x);
    var tags: string[][] = enumerations.map((e) => e.histograms);
    var all_tags: string[] = _.union.apply(null, tags);
    var categorizer = Categorizer.topLevelNamespaceCategorizer;
    var categories = categorizer(all_tags);

    var runNames = _.keys(x);
    function tag2runtag(t: string): RunTag[] {
      return runNames.filter((r) => {
        return x[r].histograms.indexOf(t) !== -1;
      }).map((r) => {return {tag: t, run: r}});
    }

    return categories.map((c) => {
      return {
        name: c.name,
        runTags: _.flatten(c.tags.map(tag2runtag))
      };
    });
  };

  backend.runs().then((x) => {
    data = histogramCategories(x);
    data.forEach(function(d: any) {
      d.runsByTag = d3.nest()
          .key(function(d: any) { return d.tag; })
          .entries(d.runTags);
    });
    filter("");
    render();

    // This adds the css scoping necessary for the new elements
    elScope.scopeSubtree(elScope.$.content, true);
  });

  //
  // Flags which charts to hide by matching the "tag" to a regexp from the
  // actions panel.
  //

  function filter(query) {
    var queryExpression = new RegExp(query, "i");
    data.forEach(function(category) {
      var matchCount = 0;
      category.runsByTag.forEach(function(tag) {
        var match = tag.key.match(queryExpression);
        if (match && match.length > 0) {
          matchCount++;
          tag.match = true;
        } else {
          tag.match = false;
        }
      });
      category.match = (matchCount > 0);
    });
    render();
  }

  //
  // Calculates the layout of all the charts. Why? Well, because we
  // can now use css transforms which are much faster (gpu optimized?) than
  // relying on page flow. This also allows us to position elements without
  // having all the preceeding siblings already in the DOM, allowing the user to
  // more efficiently jump scroll around in the list. This is a fairly cheap
  // operation, typically 1ms.
  //

  function layout() {
    console.time("layout");
    var categoryMargin = {top: 60, bottom: 20};
    var tagMargin = {top: 35, bottom: 30};
    var chartMargin = {top: 15, right: 10};

    frameWidth = el.getBoundingClientRect().width - 48;
    frameHeight = frame.getBoundingClientRect().height;
    chartWidth = Math.floor(frameWidth / numColumns) - chartMargin.right;
    chartHeight = Math.min(
      frame.getBoundingClientRect().height * 0.8,
      Math.floor(chartWidth * chartAspectRatio) - chartMargin.top
    );

    var cumulativeCategoryHeight = 0;
    data.forEach(function(category) {
      category.y = cumulativeCategoryHeight;
      var cumulativeTagHeight = 0;
      category.runsByTag.forEach(function(tag) {
        tag.y = cumulativeTagHeight + categoryMargin.top;
        tag.pageY = category.y + tag.y;
        tag.values.forEach(function(run, ri) {
          run.height = chartHeight + 15;
          run.x = (ri % numColumns) * (chartWidth + chartMargin.right);
          run.y = Math.floor(ri / numColumns) * (run.height + chartMargin.top) + tagMargin.top;
          run.pageY = run.y + tag.pageY;
        });
        tag.height = tag.values[tag.values.length - 1].y + tag.values[tag.values.length - 1].height + tagMargin.bottom + tagMargin.top;
        cumulativeTagHeight += tag.match ? tag.height : 0;
      });
      category.height = cumulativeTagHeight + categoryMargin.bottom + categoryMargin.top;
      cumulativeCategoryHeight += category.match ? category.height : 0;
    });
    console.timeEnd("layout");
  }

  //


  function render() {
    layout();
    console.time("render");

    lastRenderedScrollPosition = scrollContainer.scrollTop;
    scrollContainerTop = scrollContainer.scrollTop;
    scrollContainerBottom = scrollContainer.scrollTop + scrollContainerHeight;
    scrollContainerHeight = scrollContainer.getBoundingClientRect().height;
    bufferTop = scrollContainerTop - scrollContainerHeight;
    bufferBottom = scrollContainerBottom + 2 * scrollContainerHeight;

    // CATEGORIES
    var category = chartsContainer.selectAll(".category").data(data, (d: any) => d.name);
    var categoryExit = category.exit().remove();
    var categoryEnter = category.enter().append("div").attr("class", "category");
    var categoryUpdate = category
        .style("display", (d) => d.match ? "" : "none")
        .style("top", (d) => d.y + "px")
        .style("height", (d) => d.height + "px");
    var categoryVisibleUpdate = categoryUpdate.filter(function(d) {
      return d.y < bufferBottom && (d.y + d.height) >= bufferTop && d.match;
    });

    categoryEnter.append("h3")
        .text((d) => d.name);

    // TAGS
    var tag = categoryVisibleUpdate.selectAll(".tag").data((d: any) => d.runsByTag, (d: any) => d.key);
    var tagExit = tag.exit().remove();
    var tagEnter = tag.enter().append("div").attr("class", "tag");
    var tagUpdate = tag
        .style("display", (d) => d.match ? "" : "none")
        .style("transform", (d) => "translate(0px, " + d.y + "px)" )
        .style("height", (d) => d.height + "px");
    var tagVisibleUpdate = tagUpdate.filter(function(d) {
      return d.pageY < bufferBottom && (d.pageY + d.height) >= bufferTop && d.match;
    });

    tagEnter.append("h4")
        .text((d) => d.key);

    // RUNS
    var run = tagVisibleUpdate.selectAll(".run").data((d: any) => d.values, (d: any) => d.run);
    var runExit = run.exit().remove();
    var runEnter = run.enter().append("div").attr("class", "run");
    var runUpdate = run
        .style("transform", (d) => "translate(" + d.x + "px ," + d.y + "px)" )
        .style("width", chartWidth + "px")
        .style("height", (d) => d.height + "px");
    var runVisibleUpdate = runUpdate.filter(function(d) {
      return d.pageY < bufferBottom && (d.pageY + d.height) >= bufferTop && d.match;
    });

    runEnter.append("h5")
        .text((d: any) => d.run);

    // HISTOGRAMS
    var histogramEnter = runEnter.append("tf-vz-histogram-series")
        .property("time", chartTime)
        .property("mode", chartMode);
    var histogramUpdate = runUpdate.select("tf-vz-histogram-series");

    histogramEnter.each(function(d) {
      allCharts.push(this);
    });

    histogramUpdate.each(function(d) {
      var chart = this;
      if (!chart.dataRequested) {
        backend.histograms(d.run, d.tag).then(function(data) {
          mutateChart(chart, "data", processData(data));
          drawChart(chart);
        });
        chart.dataRequested = true;
      }
      if (chart.width !== chartWidth || chart.height !== chartHeight) {
        mutateChart(chart, "width", chartWidth);
        mutateChart(chart, "height", chartHeight);
      }
      if (chart.dirty) {
        drawChart(chart);
      }
    });

    visibleCharts = histogramUpdate.filter(function(d) {
      return d.pageY < scrollContainerBottom && (d.pageY + chartHeight) >= scrollContainerTop;
    });

    console.timeEnd("render");
  }

  //
  //TODO Processing Data. This needs some work.
  //
  function processData(data: any) {
    data.forEach(function(dd: any, i: Number) {
      var prev = null;
      dd.wallDate = new Date(dd.wall_time);
      dd.wall = dd.wallDate ? dd.wallDate.valueOf() : null;
      dd.i = i;
      dd.histogramData = dd.bucketRightEdges.map(function(ddd: any, i) {
        var bin: any = {};
        var value = (ddd === 0 ? -1e-12 : ddd)
        if (prev === null) {
          if (value > 0) {
            bin.left = (value / 1.1);
          } else {
            bin.left = (value * 1.1);
          }
        } else {
          bin.left = prev;
        }
        if (value > dd.max) {
          if (value > 0) {
            bin.right = bin.left * 1.1;
          } else {
            bin.right = bin.left / 1.1;
          }
        } else {
          bin.right = value;
        }
        bin.center = (bin.left + bin.right) / 2;
        bin.count = dd.bucketCounts[i];
        bin.area =  bin.count / (bin.right - bin.left);
        prev = ddd;
        return bin;
      });

      // TODO rebin and remove this...
      dd.histogramData = dd.histogramData.filter(function(d) { return (d.right - d.left) > 0.0035; })

      dd.binExtent = [dd.min, dd.max];
      dd.countExtent = d3.extent(dd.histogramData, function(d:any) { return d.count; });
      dd.areaMax = d3.max(dd.histogramData, function(d:any) { return d.area; })
      dd.leftMin = d3.min(dd.histogramData, function(d:any) { return d.left; });
      dd.rightMax = d3.max(dd.histogramData, function(d:any) { return d.right; });
    });
    return data.filter(function(d) { return d.step; }); //TODO Bad, some step values are undefined
  }

  //
  // Throttled events
  function throttle(eventName, throttledEventName, obj) {
    var running = false;
    var f = function(e) {
      if (running) { return; }
      running = true;
      requestAnimationFrame(function() {
        obj.dispatchEvent(new CustomEvent(throttledEventName, e));
        running = false;
      });
    };
    obj.addEventListener(eventName, f);
  }
  //
}
