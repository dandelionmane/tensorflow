module TF {

  var rm = new TF.Backend.RequestManager();
  var backend = new TF.Backend.Backend("/components/tf-tensorboard/demo/giant_data", rm, true);

  //
  // Chart sizing
  //
  var chartsContainer;
  var scrollContainer;
  var frame;
  var frameWidth;
  var frameHeight;
  var numColumns = 4;
  var chartAspectRatio = 0.75;
  var chartWidth;
  var chartHeight;

  //
  //
  //
  var visibleCharts;
  var almostVisibleCharts;
  var allCharts = [];

  //
  // Chart sizing
  //
  var scrollContainerHeight;
  var scrollContainerTop;
  var scrollContainerBottom;
  var bufferTop;
  var bufferBottom;



  enum JoyEnum {
    offset,
    overlay,
  }

  enum XEnum {
    step,
    wall_time,
    relative,
    index
  }

  interface RunTag {
    run: string;
    tag: string;
  }

  type Categories<T> = Category<T>[];
  interface Category<T> {
    key: string;
    values: T[];
  }



  function mapCategory<T, X>(f: (t: T) => X) {
    return function(c: Category<T>): Category<X> {
      return {key: c.key, values: c.values.map(f)};
    }
  }

  function mapCategories<T, X>(f: (t: T) => X) {
    return function(cs: Categories<T>): Categories<X> {
      return cs.map(mapCategory(f));
    }
  }

  interface HistogramChart extends RunTag  {
    render: Function;
  }

  export function makeHistogramDashboard(el: HTMLElement, elScope: any) {
    function histogramGenerator(joyStore: Nanite.Store<JoyEnum>, xStore: Nanite.Store<XEnum>) {
      return function(rt: RunTag) {
        return {
          run: rt.run,
          tag: rt.tag,
          render: function() {
            throw new Error("not implemented");
        }};
      }
    }

    elScope.scopeSubtree(elScope.$.content, true);

    chartsContainer = d3.select(el);
    scrollContainer = document.querySelector("#mainContainer");
    frame = elScope.$.frame;

    var joyStore = new Nanite.Store<JoyEnum>();
    var xStore = new Nanite.Store<XEnum>();

    var runsResponseStore = new Nanite.Store<TF.Backend.RunsResponse>({});
    backend.runs().then((x) => runsResponseStore.set(x));

    var chartGenerator = histogramGenerator(joyStore, xStore);
    var chartStore: Nanite.Store<HistogramChart[]> = runsResponseStore.map((r) => {
      var runs = _.keys(r);
      var out = [];
      runs.forEach((run) => {
        var tags = r[run].histograms;
        tags.forEach((tag) => out.push({run: run, tag: tag}));
      });
      return out.map(chartGenerator);
    });

    function categorizeHistograms(hists: HistogramChart[]): Categories<Category<HistogramChart>> {
      return d3.nest()
          .key(function(d: HistogramChart) { return d.tag.split("/")[0]}) // should bbe computeCategory
          .key(function(d: HistogramChart) { return d.tag; })
          .entries(hists);
    }
    var categoryStore: Nanite.Store<Categories<Category<HistogramChart>>> = chartStore.map(categorizeHistograms);
    categoryStore.out((categories) => {
      // debugger;
      // filter("");
      render(categories);
    });





    //
    // Scroll and Resize events
    //
    var lastRenderedScrollPosition = 0;
    throttle("scroll", "throttledScroll", scrollContainer);
    scrollContainer.addEventListener("throttledScroll", function() {
      if (Math.abs(lastRenderedScrollPosition - scrollContainer.scrollTop) > frameHeight * 0.5) {
        console.log("scrolling");
        render(categoryStore.value());
      }
    });

    throttle("resize", "throttledResize", window);
    window.addEventListener("throttledResize", function() {
      console.log("resizing");
      render(categoryStore.value());
    });

    //
    // Events from actions panel
    //
    var actionsPanel = elScope.$.actions;

    // actionsPanel.addEventListener("zoomchange", function(e) {
    //   var targetY = 0;
    //   var previousStageHeight = data[data.length - 1].y + data[data.length - 1].height;
    //   var previousScrollTop = scrollContainer.scrollTop + targetY;
    //   numColumns = Math.max(1, (e.detail.value === "in" ? Math.floor(numColumns - 1) : Math.ceil(numColumns + 1)));
    //   layout();
    //   var newStageHeight = data[data.length - 1].y + data[data.length - 1].height;
    //   scrollContainer.scrollTop = previousScrollTop * (newStageHeight / previousStageHeight ) - targetY;
    //   render(categoryStore.value());
    // });


    actionsPanel.addEventListener("modechange", function(e) {
      var v = e.detail.value === "overlay" ? JoyEnum.overlay : JoyEnum.offset;
      joyStore.set(v);
    });
    joyStore.out(function(val) {
      allCharts.forEach(function(chart) {
        mutateChart(chart, "mode", (val === 0 ? "offset" : "overlay"));
      });
      updateVisibleCharts();
    });

    //
    // actionsPanel.addEventListener("timechange", function(e) {
    //   allCharts.forEach(function(chart) {
    //     mutateChart(chart, "time", e.detail.value);
    //   });
    //   var v = {'step': XEnum.step, 'index': XEnum.index, 'wall_time': XEnum.wall_time, 'relative': XEnum.relative}[e.detail.value];
    //   xStore.set(v);
    //   updateVisibleCharts();
    // });
    //

    throttle("searchchange", "throttledSearchchange", actionsPanel);
    actionsPanel.addEventListener("throttledSearchchange", function(e) {
      filter(e.detail.value, categoryStore.value());
    });

    function mutateChart(c, property, value) {
      c[property] = value;
      c.dirty = true;
    }

    function drawChart(c, animationDuration?: number) {
      c.draw(animationDuration);
      c.dirty = false;
    }

    function updateVisibleCharts() {
      visibleCharts.each(function(d:any) {
        console.log("draw")
        drawChart(this, 1000);
      });
    }


    function filter(query, data) {
      var queryExpression = new RegExp(query, "i");
      data.forEach(function(category) {
        var matchCount = 0;
        category.values.forEach(function(tag) {
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
      render(data);
    }

    function layout(data) {
      console.time("layout");
      var categoryMargin = {top: 60, bottom: 20};
      var tagMargin = {top: 35, bottom: 30, left: 24};
      var runMargin = {top: 20};
      var chartMargin = {top: 15, right: 0};

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
        category.values.forEach(function(tag) {
          tag.x = tagMargin.left;
          tag.y = cumulativeTagHeight + categoryMargin.top;
          tag.pageY = category.y + tag.y;
          tag.values.forEach(function(run, ri) {
            run.height = chartHeight + 15;
            run.x = (ri % numColumns) * (chartWidth + chartMargin.right) - 24;
            run.y = Math.floor(ri / numColumns) * (run.height + chartMargin.top) + tagMargin.top + runMargin.top;
            run.pageY = run.y + tag.pageY;
          });
          tag.height = tag.values[tag.values.length - 1].y + tag.values[tag.values.length - 1].height + tagMargin.bottom + tagMargin.top;
          cumulativeTagHeight += (tag.match === false ? 0 : tag.height);
        });
        category.height = cumulativeTagHeight + categoryMargin.bottom + categoryMargin.top;
       cumulativeCategoryHeight += (category.match === false ? 0 : category.height);
     });
     console.timeEnd("layout");
   }


    function render(data) {
      layout(data);
      console.time("render");

      lastRenderedScrollPosition = scrollContainer.scrollTop;
      scrollContainerTop = scrollContainer.scrollTop;
      scrollContainerBottom = scrollContainer.scrollTop + scrollContainerHeight;
      scrollContainerHeight = scrollContainer.getBoundingClientRect().height;
      bufferTop = scrollContainerTop - scrollContainerHeight;
      bufferBottom = scrollContainerBottom + 2 * scrollContainerHeight;

      // CATEGORIES
      var category = chartsContainer.selectAll(".category").data(data, (d: any) => d.key);
      var categoryExit = category.exit().remove();
      var categoryEnter = category.enter().append("div").attr("class", "category");
      var categoryUpdate = category
          .style("display", (d) => d.match === false ? "none" : "")
          .style("top", (d) => d.y + "px")
          .style("height", (d) => d.height + "px");
      var categoryVisibleUpdate = categoryUpdate.filter(function(d) {
        return d.y < bufferBottom && (d.y + d.height) >= bufferTop && d.match !== false;
      });

      categoryEnter.append("h3").text((d) => d.key);

      // TAGS
      var tag = categoryVisibleUpdate.selectAll(".tag").data((d: any) => d.values, (d: any) => d.key);
      var tagExit = tag.exit().remove();
      var tagEnter = tag.enter().append("div").attr("class", "tag");
      var tagUpdate = tag
          .style("display", (d) => d.match === false ? "none" : "")
          .style("transform", (d) => "translate(" + d.x + "px, " + d.y + "px)" )
          .style("height", (d) => d.height + "px");
      var tagVisibleUpdate = tagUpdate.filter(function(d) {
        return d.pageY < bufferBottom && (d.pageY + d.height) >= bufferTop && d.match !== false;
      });

      tagEnter.append("h4").text((d) => d.key);

      // RUNS
      var run = tagVisibleUpdate.selectAll(".run").data((d: any) => d.values, (d: any) => d.run);
      var runExit = run.exit().remove();
      var runEnter = run.enter().append("div").attr("class", "run");
      var runUpdate = run
          .style("transform", (d) => "translate(" + d.x + "px ," + d.y + "px)" )
          .style("width", chartWidth + "px")
          .style("height", (d) => d.height + "px");
      var runVisibleUpdate = runUpdate.filter(function(d) {
        return d.pageY < bufferBottom && (d.pageY + d.height) >= bufferTop && d.match !== false;
      });

      runEnter.append("h5").text((d) => d.run);

      // HISTOGRAMS
      var histogramEnter = runEnter.append("tf-vz-histogram-series")
          // .property("time", chartTime)
          // .property("mode", chartMode);
      var histogramUpdate = runUpdate.select("tf-vz-histogram-series");

      histogramEnter.each(function() {
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
        return d.pageY < scrollContainerBottom && (d.pageY + d.height) >= scrollContainerTop;
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

        dd.leftMin = d3.min(dd.histogramData, function(d:any) { return d.left; });
        dd.rightMax = d3.max(dd.histogramData, function(d:any) { return d.right; });
        var binWidth = (dd.rightMax - dd.leftMin) / 100
        dd.syntheticBins = d3.range(dd.leftMin, dd.rightMax, binWidth).map(function(left) {
          var right = left + binWidth;
          var count = d3.sum(dd.histogramData.map(function(d) {
            var w = d.right - d.left;
            var w2 = Math.min(d.right, right) - Math.max(d.left, left);
            return (w2 > 0 ? (w2 / w) * d.count : 0);
          }));
          return {
            x: left,
            dx: binWidth,
            y: count
          };
        });
        dd.syntheticExtent = d3.extent(dd.syntheticBins.filter((d:any) => d.y > 0), (d:any) => d.x);
        dd.countExtent = d3.extent(dd.syntheticBins, function(d:any) { return d.y; });

      });
      return data.filter(function(d) { return d.step; }); //TODO Bad, some step values are undefined
    }

    //
    // Throttled events
    //
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

  }
}
