import { Record } from "immutable"

import ResourceStoreRecord from "../records/ResourceStoreRecord"
import EdgeRecord from "../records/EdgeRecord"

// TODO: handle mutations
// TODO: handle optimistic updates for mutations
class Store {
  constructor(schema) {
    this.subscribers = new Set()
    this.schema = schema
    this.initiateState()
  }
  initiateState() {
    const State = Record(
      Object.keys(this.schema)
        .reduce((acc, key) => ({ ...acc, [key]: this.schema[key](key) }), {})
    )
    this.state = new State()
  }
  subscribe(func) {
    this.subscribers.add(func)
    return () => this.subscribers.delete(func)
  }
  update(func) {
    const nextState = func(this.state)
    this.state = nextState
    if(this.state !== nextState) {
      this.subscribers.forEach((subscriber) => subscriber())
    }
  }
  getState() {
    return this.state
  }
  injectNetworkLayer(network) {
    this.network = network
  }
  query(query) {
    const networkRequest = this.network.send(query.getQuery())
    return networkRequest
      .then((response) => {
        this.update((state) => {
          return query.getConfigs(response).reduce(applyUpdate, state)
        })
      })
      .catch((error) => {
        this.update((state) => {
          const mainConfig = query.getConfigs(response)[0]
          if(mainConfig) {
            this.update((state) => {
              return applyUpdate(state, { ...mainConfig, type: "ERROR", originalType: mainConfig.type })
            })
          }
        })
      })
  }
}

const getPathFromUpdateType = (type, id) => {
  switch(type) {
    case "CHANGE":
      return []
    case "DELETE":
      return []
    case "CHANGE_NODE":
      return ["nodes", id]
    case "DELETE_NODE":
      return ["nodes", id]
    case "RANGE_ADD":
      return ["lists", id]
    case "RANGE_DELETE":
      return ["lists", id]
    default:
      return []
  }
}

const applyUpdate = (state, update) => {
  const path = [ update.field, ...getPathFromUpdateType(update.type, update.id) ]
  switch(update.type) {
    case "ERROR":
      return state.updateIn(path, (object) => object.setStatusAsErrored(update.error))
    case "CHANGE_NODE":
      return state.updateIn(path, (edge) => edge.setNodeValue(update.value))
    case "DELETE_NODE":
      return state.deleteIn(path, update.id)
    case "CHANGE":
      return state.updateIn(path, (edge) => edge.setNodeValue(update.value))
    case "DELETE":
      return state.deleteIn(path, update.id)
    case "RANGE_ADD":
      return state.updateIn(path, (list) => list.pushEdges(...update.value))
    case "RANGE_DELETE":
      return state.updateIn(path, (list) => list.update("edges", (edges) => edges.filter((item) => !(item in update.deleteIDs))))
    case "UPDATE":
      return state.updateIn([update.field, ...update.path], update.update)
    default:
      return state
  }
}


Store.create = (schema) => {
  return new Store(schema)
}

Store.resource = (type) => {
  return (name) => new ResourceStoreRecord(name, type)
}

Store.type = (type) => {
  return (name) => EdgeRecord.create(name, type)
}

export default Store
