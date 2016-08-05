import { Record } from "immutable"

import ResourceStoreRecord from "../records/ResourceStoreRecord"
import EdgeRecord from "../records/EdgeRecord"

// TODO: handle mutations
// TODO: handle optimistic updates for mutations
class Store {
  constructor(schema) {
    this.subscribers = new Set()
    this.schema = schema
    this.pendingMutations = new Set()
    this.updates = []
    this.initiateState()
    this.addUpdate = this.addUpdate.bind(this)
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
        this.update((state) => {
          return query.__getConfigs(response).map(this.addUpdate).reduce(applyUpdate, state)
        })
      })
      .catch((error) => {
        this.update((state) => {
          const mainConfig = this.addUpdate(query.__getConfigs(error)[0])
          if(mainConfig) {
            this.update((state) => {
              return applyUpdate(state, { ...mainConfig, type: "ERROR", originalType: mainConfig.type })
            })
          }
        })
        return Promise.reject()
      })
  }
  fork(id) {
    if(this.pendingMutations.size === 0) {
      this.forkState = this.state
    }
    this.pendingMutations.add(id)
  }
  commit(id) {
    this.pendingMutations.delete(id)
    this.update((state) => {
      console.log(this.updates.reduce(applyUpdate, this.forkState))
      return this.updates.reduce(applyUpdate, this.forkState)
    })
    this.updates = []
    this.forkState = null
  }
  rollback(id) {
    this.pendingMutations.delete(id)
    this.update((state) => {
      return this.updates.filter((item) => item.mutationID !== id).reduce(applyUpdate, this.forkState)
    })
    this.updates = []
    this.forkState = null
  }
  commitUpdate(mutation) {
    this.fork(mutation.id)
    this.query(mutation)
      .catch(() => this.rollback(mutation.id))
      .then(() => this.commit(mutation.id))
  }
  getData(component, props = {}) {
    const queryObject = component.getQueries(props)
    const queries = Object.keys(queryObject)
      .map((key) => queryObject[key])
      .filter((query) => query.shouldQuery(this.state))
    return Promise.all(queries.map((query) => this.query(query)))
  }
  addUpdate(update) {
    if(this.pendingMutations.size > 0) {
      this.updates.push(update)
    }
    return update
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
