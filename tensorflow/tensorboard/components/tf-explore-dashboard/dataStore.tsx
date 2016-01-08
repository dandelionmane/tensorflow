
class DataStore extends Store {

  private router: TF.Urls.Router;

  constructor(router: TF.Urls.Router) {
    super();
    this.router = router;
  }
}
