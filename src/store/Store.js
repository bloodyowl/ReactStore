import { Record } from "immutable"

import ResourceStoreRecord from "../records/ResourceStoreRecord"
import EdgeRecord from "../records/EdgeRecord"
import ListRecord from "../records/ListRecord"

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
    const networkRequest = this.network.send(query.getQuery(this.state))
    this.enqueueUpdates(
      query.__getConfigs()
        .filter((item) => item.type === "CHANGE" || item.type === "CHANGE_NODE" || item.type === "RANGE_ADD")
        .map((item) => Object.assign({}, item, { type: getLoadTypeFromUpdateType(item.type) }))
    )
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
    const nextState = updates.reduce(reconcile, this.lastStableState)
    if(this.state !== nextState) {
      this.state = nextState
      this.subscribers.forEach((subscriber) => subscriber())
    }
  }
  getData(component, props = {}, variables = component.getInitialVariables()) {
    const queryObject = component.getQueries(props, variables)
    const queries = Object.keys(queryObject)
      .map((key) => queryObject[key])
      .filter((query) => query.shouldQuery(this.state, variables))
    return Promise.all(queries.map((query) => this.query(query)))
  }
}

const getLoadTypeFromUpdateType = (type) => {
  switch(type) {
    case "RANGE_ADD":
      return "LOAD_RANGE"
    case "CHANGE":
      return "LOAD"
    case "CHANGE_NODE":
      return "LOAD_NODE"
  }
}

const reconcile = (state, update) => {
  switch(update.type) {

    case "ERROR":
      return state.update(update.field, (edge) => edge.setStatusAsErrored(update.error))

    case "CHANGE_NODE":
      return state.update(update.field, (resource) => resource.node(update.id, (edge) => edge.setNodeValue(update.value)))
    case "LOAD_NODE":
      return state.update(update.field, (resource) => ressource.node(update.id, (edge) => edge.setStatusAsLoading()))
    case "DELETE_NODE":
      return state.update(update.field, (resource) => resource.deleteNode(update.id))

    case "LOAD":
      return state.update(update.field, (edge) => edge.setStatusAsLoading())
    case "CHANGE":
      return state.update(update.field, (edge) => edge.setNodeValue(update.value))
    case "DELETE":
      return state.deleteIn([update.field, update.value])

    case "RANGE_ADD":
      return state.update(update.field, (resource) => resource.pushEdgesToList(update.id, update.value))
    case "LOAD_RANGE":
      return state.update(update.field, (resource) => resource.list(update.id, (list) => list.setStatusAsLoading()))
    case "RANGE_DELETE":
      return state.update(update.field, (resource) => resource.list(update.id, (list) => list.update("edges", (edges) => edges.filter((item) => !(item in update.deleteIDs)))))

    default:
      return state
  }
}


Store.create = (schema) => {
  return new Store(schema)
}

Store.resource = (type) => {
  return (name) => ResourceStoreRecord.create(name, type)
}

Store.type = (type) => {
  return (name) => EdgeRecord.create(name, type)
}

export default Store
