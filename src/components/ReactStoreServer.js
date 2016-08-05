const ReactStoreServer = {
  getData(store, component, props = {}) {
    return store.getData(component, props)
  }
}

export default ReactStoreServer
