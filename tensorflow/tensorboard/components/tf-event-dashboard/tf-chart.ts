/* Copyright 2015 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
module TF {
  export type DataFn = (run: string, tag: string) => Promise<Array<Backend.Datum>>;

  let Y_TOOLTIP_FORMATTER_PRECISION = 4;
  let STEP_AXIS_FORMATTER_PRECISION = 4;
  let Y_AXIS_FORMATTER_PRECISION = 3;

  interface Point {
    run: string;
    x: number | Date;
    y: number;
    xStr: string;
    yStr: string;
  }

  type CrosshairResult = {[runName: string]: Point};

  export class BaseChart {
    protected dataFn: DataFn;
    protected tag: string;
    private datasets: {[run: string]: Plottable.Dataset};
    protected runs: string[];

    protected xAccessor: Plottable.Accessor<number | Date>;
    protected xScale: Plottable.QuantitativeScale<number | Date>;
    protected yScale: Plottable.QuantitativeScale<number>;
    protected gridlines: Plottable.Components.Gridlines;
    protected center: Plottable.Components.Group;
    protected xAxis: Plottable.Axes.Numeric | Plottable.Axes.Time;
    protected yAxis: Plottable.Axes.Numeric;
    protected xLabel: Plottable.Components.AxisLabel;
    protected yLabel: Plottable.Components.AxisLabel;
    protected outer: Plottable.Components.Table;
    protected colorScale: Plottable.Scales.Color;
    protected xTooltipFormatter: (d: number) => string;
    protected tooltip: d3.Selection<any>;
    constructor(
        tag: string,
        dataFn: DataFn,
        xType: string,
        colorScale: Plottable.Scales.Color
      ) {
      this.dataFn = dataFn;
      this.datasets = {};
      this.tag = tag;
      this.colorScale = colorScale;
      this.buildChart(xType);
    }

    /**
     * Change the runs on the chart. The work of actually setting the dataset
     * on the plot is deferred to the subclass because it is impl-specific.
     * Changing runs automatically triggers a reload; this ensures that the
     * newly selected run will have data, and that all the runs will be current
     * (it would be weird if one run was ahead of the others, and the display
     * depended on the order in which runs were added)
     */
    public changeRuns(runs: string[]) {
      this.runs = runs;
      this.reload();
    }

    /**
     * Reload data for each run in view.
     */
    public reload() {
      this.runs.forEach((run) => {
        var dataset = this.getDataset(run);
        this.dataFn(this.tag, run).then((x) => dataset.data(x));
      });
    }

    protected getDataset(run: string) {
      if (this.datasets[run] === undefined) {
        this.datasets[run] = new Plottable.Dataset([], {run: run, tag: this.tag});
      }
      return this.datasets[run];
    }

    protected buildChart(xType: string) {
      if (this.outer) {
        this.outer.destroy();
      }
      var xComponents = getXComponents(xType);
      this.xAccessor = xComponents.accessor;
      this.xScale = xComponents.scale;
      this.xAxis = xComponents.axis;
      this.xAxis.margin(0).tickLabelPadding(3);
      this.xTooltipFormatter = xComponents.tooltipFormatter;
      this.yScale = new Plottable.Scales.Linear();
      this.yAxis = new Plottable.Axes.Numeric(this.yScale, "left");
      let yFormatter = multiscaleFormatter(Y_AXIS_FORMATTER_PRECISION);
      this.yAxis.margin(0).tickLabelPadding(5).formatter(yFormatter);
      this.yAxis.usesTextWidthApproximation(true);

      var center = this.buildPlot(this.xAccessor, this.xScale, this.yScale);

      this.gridlines = new Plottable.Components.Gridlines(this.xScale, this.yScale);

      var dzl = new Plottable.DragZoomLayer(this.xScale, this.yScale);

      this.center = new Plottable.Components.Group([this.gridlines, center, dzl]);
      this.outer =  new Plottable.Components.Table([
                                                   [this.yAxis, this.center],
                                                   [null, this.xAxis]
                                                  ]);
    }

    protected buildPlot(xAccessor, xScale, yScale): Plottable.Component {
      throw new Error("Abstract method not implemented.");
    }

    public renderTo(target: d3.Selection<any>) {
      this.outer.renderTo(target);
      // var el = <HTMLElement>target.node();
      // var tt = <HTMLElement>this.tooltip.node();
      // el.parentNode.appendChild(tt);
    }

    public redraw() {
      this.outer.redraw();
    }

    protected destroy() {
      this.outer.destroy();
    }
  }

  export class LineChart extends BaseChart {
    private plot: Plottable.Plots.Line<number | Date>;

    protected buildPlot(xAccessor, xScale, yScale): Plottable.Component {
      var yAccessor = (d: Backend.ScalarDatum) => d.scalar;
      var plot = new Plottable.Plots.Line<number | Date>();
      plot.x(xAccessor, xScale);
      plot.y(yAccessor, yScale);
      plot.attr("stroke",
        (d: Backend.Datum, i: number, dataset: Plottable.Dataset) => dataset.metadata().run,
        this.colorScale);
      this.plot = plot;
      this.tooltip = d3.select("body").append("div");
      var group = this.addCrosshairs(plot, yAccessor);
      return group;
    }

    protected addCrosshairs(plot: Plottable.XYPlot<number | Date, number>, yAccessor): Plottable.Components.Group {
      var pi = new Plottable.Interactions.Pointer();
      pi.attachTo(plot);
      let pointsComponent = new Plottable.Component();
      let tooltipTextComponent = new Plottable.Component();
      let tooltipBackgroundComponent = new Plottable.Component();
      var group = new Plottable.Components.Group([plot, pointsComponent, tooltipBackgroundComponent, tooltipTextComponent]);
      let yfmt = multiscaleFormatter(Y_TOOLTIP_FORMATTER_PRECISION);

      this.tooltip
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("display", "none")
          .style("box-shadow", "0 1px 4px rgba(0, 0, 0, 0.3)")
          .style("font-size", "11px")
          .style("background", "rgba(0, 0, 0, 0.8)")
          .style("color", "white")
          .style("border-radius", "2px")
          .style("padding", "8px")
          .style("top", "200px")
          .style("line-height", "1.4em")
          .style("left", "300px");
          // .style("transition", "top 0.2s, left 0.2s");

      var tooltipHeadline = this.tooltip.append("h4")
          .style("margin", "0 0 2px 0")
          .style("font-weight", "normal");

      var xLabel = this.tooltip.append("div").attr("class", "tooltip-run");
      xLabel.append("span")
          .text("Step")
          .style("display", "inline-block")
          .style("opacity", 0.7)
          .style("width", "40px");
      var xLabelValue = xLabel.append("span");
      var yLabel = this.tooltip.append("div").attr("class", "tooltip-run");
      yLabel.append("span")
          .text("Value")
          .style("display", "inline-block")
          .style("opacity", 0.7)
          .style("width", "40px");
      var yLabelValue = yLabel.append("span");

      pi.onPointerMove((p: Plottable.Point) => {

        let run2p: {[run: string]: Point} = {};
        let px = this.xScale.invert(p.x);
        let py = this.yScale.invert(p.y);
        let pointer: Point = {
          run: null,
          x: px,
          y: py,
          xStr: this.xTooltipFormatter(px.valueOf()),
          yStr: yfmt(py.valueOf()),
        };

        plot.datasets().forEach((dataset) => {
          let run: string = dataset.metadata().run;
          let points: Point[] = dataset.data().map((d, i) => {
            let x = this.xAccessor(d, i, dataset);
            let y = yAccessor(d, i, dataset);
            return {
              x: x,
              y: y,
              xStr: this.xTooltipFormatter(x.valueOf()),
              yStr: yfmt(y.valueOf()),
              run: run,
            };
          });
          let idx: number = _.sortedIndex(points, pointer, (p: Point) => p.x.valueOf());
          let p: Point;
          if (idx === points.length) {
            p = points[points.length - 1];
          } else if (idx === 0) {
            p = points[0];
          } else {
            let prev = points[idx-1];
            let next = points[idx];
            let pDist = Math.abs(prev.x.valueOf() - pointer.x.valueOf());
            let nDist = Math.abs(next.x.valueOf() - pointer.x.valueOf());
            p = pDist < nDist ? prev : next;
          }
          run2p[run] = p;
        });

        let points: Point[] = <Point[]> _.values(run2p);

        var closestByEuclDistance: Point = _.min(points, (p: Point) => {
          var xDist = p.x.valueOf() - pointer.x.valueOf();
          var yDist = p.y.valueOf() - pointer.y.valueOf();
          return xDist * xDist + yDist * yDist;
        });

        let pts: any = pointsComponent.content().selectAll(".point").data(points, (p: Point) => p.run);
        pts.enter().append("circle").classed("point", true)
        pts
            .attr("r", (p) => p.run === closestByEuclDistance.run ? 5 : 3)
            .attr("cx", (p) => this.xScale.scale(p.x))
            .attr("cy", (p) => this.yScale.scale(p.y))
            .style("stroke", "none")
            .attr("fill", (p) => this.colorScale.scale(p.run));
        pts.exit().remove();

        var plotElement = <HTMLElement>plot.content().node();
        var plotBBox = plotElement.getBoundingClientRect();
        var tooltipElement = <HTMLElement>this.tooltip.node();
        var tooltipBBox = tooltipElement.getBoundingClientRect();
        this.tooltip
            .style("display", "block")
            .style("left", (p) => this.xScale.scale(closestByEuclDistance.x) + plotBBox.left - tooltipBBox.width - 30 + "px")
            .style("top", (p) => this.yScale.scale(closestByEuclDistance.y) + plotBBox.top - tooltipBBox.height - 30 + "px");

        xLabelValue.text(closestByEuclDistance.xStr);
        yLabelValue.text(closestByEuclDistance.yStr);
        tooltipHeadline.text(closestByEuclDistance.run);

      });

      pi.onPointerExit(() => {
        this.tooltip.style("display", "none");
        pointsComponent.content().selectAll(".point").remove();
      });

      return group;

    }

    public changeRuns(runs: string[]) {
      super.changeRuns(runs);
      var datasets = runs.map((r) => this.getDataset(r));
      this.plot.datasets(datasets);
    }
  }

  export class HistogramChart extends BaseChart {
    private plots: Plottable.XYPlot<number | Date, number>[];

    public changeRuns(runs: string[]) {
      super.changeRuns(runs);
      var datasets = runs.map((r) => this.getDataset(r));
      this.plots.forEach((p) => p.datasets(datasets));
    }

    protected buildPlot(xAccessor, xScale, yScale): Plottable.Component {
      var percents =  [0, 228, 1587, 3085, 5000, 6915, 8413, 9772, 10000];
      var opacities = _.range(percents.length - 1).map((i) => (percents[i + 1] - percents[i]) / 2500);
      var accessors = percents.map((p, i) => (datum) => datum[i][1]);
      var median = 4;
      var medianAccessor = accessors[median];

      var plots = _.range(accessors.length - 1).map((i) => {
        var p = new Plottable.Plots.Area<number | Date>();
        p.x(xAccessor, xScale);

        var y0 = i > median ? accessors[i] : accessors[i + 1];
        var y  = i > median ? accessors[i + 1] : accessors[i];
        p.y(y, yScale);
        p.y0(y0);
        p.attr("fill",
          (d: any, i: number, dataset: Plottable.Dataset) =>
            dataset.metadata().run,
          this.colorScale);
        p.attr("stroke",
          (d: any, i: number, dataset: Plottable.Dataset) =>
            dataset.metadata().run,
          this.colorScale);
        p.attr("stroke-weight", (d: any, i: number, m: any) => "0.5px");
        p.attr("stroke-opacity", () => opacities[i]);
        p.attr("fill-opacity", () => opacities[i]);
        return p;
      });

      var medianPlot = new Plottable.Plots.Line<number | Date>();
      medianPlot.x(xAccessor, xScale);
      medianPlot.y(medianAccessor, yScale);
      medianPlot.attr("stroke", (d: any, i: number, m: any) => m.run, this.colorScale);

      this.plots = plots;
      return new Plottable.Components.Group(plots);
    }
  }

  /* Create a formatter function that will switch between exponential and
   * regular display depending on the scale of the number being formatted,
   * and show `digits` significant digits.
   */
  function multiscaleFormatter(digits: number): ((v: number) => string) {
    return (v: number) => {
      var absv = Math.abs(v);
      if (absv < 1E-15) {
        // Sometimes zero-like values get an annoying representation
        absv = 0;
      }
      var f: (x: number) => string;
      if (absv >= 1E4) {
        f = d3.format("." + digits + "e");
      } else if (absv > 0 && absv < 0.01) {
        f = d3.format("." + digits + "e");
      } else {
        f = d3.format("." + digits + "g");
      }
      return f(v);
    };
  }

  function accessorize(key: string): Plottable.Accessor<number> {
    return (d: any, index: number, dataset: Plottable.Dataset) => d[key];
  }

  interface XComponents {
    /* tslint:disable */
    scale: Plottable.Scales.Linear | Plottable.Scales.Time,
    axis: Plottable.Axes.Numeric | Plottable.Axes.Time,
    accessor: Plottable.Accessor<number | Date>,
    tooltipFormatter: (d: number) => string;
    /* tslint:enable */
  }

  function stepX(): XComponents {
    var scale = new Plottable.Scales.Linear();
    var axis = new Plottable.Axes.Numeric(scale, "bottom");
    var formatter = Plottable.Formatters.siSuffix(STEP_AXIS_FORMATTER_PRECISION);
    axis.formatter(formatter);
    return {
      scale: scale,
      axis: axis,
      accessor: (d: Backend.Datum) => d.step,
      tooltipFormatter: formatter,
    };
  }

  function wallX(): XComponents {
    var scale = new Plottable.Scales.Time();
    var formatter = Plottable.Formatters.time("%a %b %e, %H:%M:%S");
    return {
      scale: scale,
      axis: new Plottable.Axes.Time(scale, "bottom"),
      accessor: (d: Backend.Datum) => d.wall_time,
      tooltipFormatter: (d: number) => formatter(new Date(d)),
    };
  }

  function relativeX(): XComponents {
    var scale = new Plottable.Scales.Linear();
    var formatter = (n: number) => {
      var days = Math.floor(n / 24);
      n -= (days * 24);
      var hours = Math.floor(n);
      n -= hours;
      n *= 60;
      var minutes = Math.floor(n);
      n -= minutes;
      n *= 60;
      var seconds = Math.floor(n);
      return days + "d " + hours + "h " + minutes + "m " + seconds + "s";
    };
    return {
      scale: scale,
      axis: new Plottable.Axes.Numeric(scale, "bottom"),
      accessor: (d: Backend.Datum, index: number, dataset: Plottable.Dataset) => {
        var data = dataset.data();
        // I can't imagine how this function would be called when the data is empty
        // (after all, it iterates over the data), but lets guard just to be safe.
        var first = data.length > 0 ? +data[0].wall_time : 0;
        return (+d.wall_time - first) / (60 * 60 * 1000); // ms to hours
      },
      tooltipFormatter: formatter,
    };
  }

  function getXComponents(xType: string): XComponents {
    switch (xType) {
      case "step":
        return stepX();
      case "wall_time":
        return wallX();
      case "relative":
        return relativeX();
      default:
        throw new Error("invalid xType: " + xType);
    }
  }
}
