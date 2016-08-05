import { Record } from "immutable"

import ResourceStoreRecord from "../records/ResourceStoreRecord"
import EdgeRecord from "../records/EdgeRecord"

// TODO: handle mutations
// TODO: handle optimistic updates for mutations
class Store {
  constructor(schema) {
    this.subscribers = new Set()
    this.schema = schema
    this.activeMutations = new Set()
    this.actionStack = []
    this.lastStableState = null
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
  enqueueUpdates(updates) {
    if(this.activeMutations.size > 0) {
      if(this.actionStack.length === 0) {
        this.lastStableState = this.state
      }
      this.actionStack.push(...updates)
    } else {
      this.lastStableState = null
      this.actionStack.length = 0
    }
    const nextState = updates.reduce(reconcile, this.state)
    if(this.state !== nextState) {
      this.state = nextState
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
        this.enqueueUpdates(query.__getConfigs(response))
      })
      .catch((error) => {
        const mainConfig = query.__getConfigs(error)[0]
        if(mainConfig) {
          this.enqueueUpdates([
            { ...mainConfig, type: "ERROR", originalType: mainConfig.type }
          ])
          return Promise.reject()
        }
        return Promise.reject()
      })
  }
  commitUpdate(mutation) {
    this.activeMutations.add(mutation.id)
    this.enqueueUpdates(
      mutation.__getOptimisticConfig()
        .concat(
          mutation.__getConfigs()
            .filter((item) => item.type === "CHANGE" || item.type === "CHANGE_NODE" || item.type === "RANGE_ADD")
            .map((item) => Object.assign({}, item, { type: getLoadTypeFromUpdateType(item.type) }))
        )
    )
    this.query(mutation)
      .then(() => this.activeMutations.delete(mutation.id))
      .catch(() => {
        this.activeMutations.delete(mutation.id)
        this.revertOptimisticUpdate(mutation.id)
      })
  }
  revertOptimisticUpdate(mutationID) {
    const updates = this.actionStack.filter((item) => !(item.mutationID === mutationID && item.isOptimistic))
    console.log(this.actionStack, updates)
    const nextState = updates.reduce(reconcile, this.lastStableState)
    if(this.state !== nextState) {
      this.state = nextState
      this.subscribers.forEach((subscriber) => subscriber())
    }
  }
  getData(component, props = {}) {
    const queryObject = component.getQueries(props)
    const queries = Object.keys(queryObject)
      .map((key) => queryObject[key])
      .filter((query) => query.shouldQuery(this.state))
    return Promise.all(queries.map((query) => this.query(query)))
  }
}

const getLoadTypeFromUpdateType = (type) => {
  switch(type) {
    case "CHANGE":
      return "LOAD"
    case "CHANGE_NODE":
      return "LOAD_NODE"
    case "RANGE_ADD":
      return "LOAD_RANGE"
  }
}

const getPathFromUpdateType = (type, id) => {
  switch(type) {
    case "CHANGE":
      return []
    case "LOAD":
      return []
    case "DELETE":
      return []
    case "CHANGE_NODE":
      return ["nodes", id]
    case "LOAD_NODE":
      return ["nodes", id]
    case "DELETE_NODE":
      return ["nodes", id]
    case "RANGE_ADD":
      return ["lists", id]
    case "RANGE_DELETE":
      return ["lists", id]
    case "LOAD_RANGE":
      return ["lists", id]
    default:
      return []
  }
}

const reconcile = (state, update) => {
  const path = [ update.field, ...getPathFromUpdateType(update.type, update.id) ]
  switch(update.type) {
    case "ERROR":
      return state.updateIn(path, (object) => object.setStatusAsErrored(update.error))
    case "LOAD":
      return state.updateIn(path, (edge) => edge.setStatusAsLoading())
    case "CHANGE_NODE":
      return state.updateIn(path, (edge) => edge.setNodeValue(update.value))
    case "LOAD_NODE":
      return state.updateIn(path, (edge) => edge.setStatusAsLoading())
    case "DELETE_NODE":
      return state.deleteIn(path, update.id)
    case "CHANGE":
      return state.updateIn(path, (edge) => edge.setNodeValue(update.value))
    case "DELETE":
      return state.deleteIn(path, update.id)
    case "RANGE_ADD":
      return state.updateIn(path, (list) => list.pushEdges(...update.value))
    case "LOAD_RANGE":
      return state.updateIn(path, (list) => list.setStatusAsLoading())
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
