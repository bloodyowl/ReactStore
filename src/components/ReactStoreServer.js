const ReactStoreServer = {
  getData(store, component, props = {}) {
    const queryObject = component.getQueries(props)
    const queries = Object.keys(queryObject).map((key) => queryObject[key])
    return Promise.all(queries.map((query) => store.query(query)))
  }
}

export default ReactStoreServer
