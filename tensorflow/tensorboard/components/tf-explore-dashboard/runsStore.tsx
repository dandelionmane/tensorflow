
interface Run {
  name: string;
}

interface IndividualRunJSON {
  graph: boolean;
  compressedHistograms: string[];
  histograms: string[];
  images: string[];
  scalars: string[];
}

interface RunsResponseJSON {
  [run: string]: IndividualRunJSON;
}

class RunsStore extends Store {
  public runs: string[];
  public tags: string[];
  public categories: Categorizer.Category[];
  public tag2run: {[tag: string]: string[]};

  private router: TF.Urls.Router;

  constructor(router: TF.Urls.Router) {
    super();
    this.router = router;
    this.runs = [];
    this.tags = [];
    this.categories = [];
    this.tag2run = {};
    this.fetchRuns();
  }

  public fetchRuns() {
    var runsUrl = this.router.runs();
    d3.json(runsUrl, (error, json: RunsResponseJSON) => {
      if (error) {
        console.error(error);
      } else {
        this.process_run2tag(json);
        this.updateState();
      }
    });
  }

  private process_run2tag(run2tag: RunsResponseJSON) {
    this.runs = _.keys(run2tag);

    this.tags = _.union.apply(null, _.values(run2tag).map((irj: any) => irj.scalars));
    var extractor = function(s) {
      var groupRegEx =/[a-z-_]+/i;
      return groupRegEx.exec(s)[0];
    }
    var categorizer = Categorizer.extractorToCategorizer(extractor);
    this.categories = categorizer(this.tags);
    this.tag2run = {};
    this.tags.forEach((t: string) => {
      var runsForThisTag = [];
      this.runs.forEach((r: string) => {
        if (run2tag[r].scalars.indexOf(t) !== -1) {
          runsForThisTag.push(r);
        }
      });
      this.tag2run[t] = runsForThisTag;
    });
  }
}
