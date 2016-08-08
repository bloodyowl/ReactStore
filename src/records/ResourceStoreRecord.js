import { Record, Map } from "immutable"

import EdgeRecord from "./EdgeRecord"
import ListRecord from "./ListRecord"

const RawResourceStoreRecord = Record({
  name: "Resource",
  type: new Record({}),
  nodes: Map(),
  lists: Map(),
})

class ResourceStoreRecord extends RawResourceStoreRecord {
  node(id, cb) {
    const localID = `${ this.name }:edge(${ id })`
    return this.updateIn(["nodes", id], EdgeRecord.create(localID, this.type), cb)
  }
  list(id, cb) {
    const localID = `${ this.name }:list(${ id })`
    return this.updateIn(["lists", id], ListRecord.create(localID), cb)
  }
  getList(id) {
    const localID = `${ this.name }:list(${ id })`
    return this.getIn(["lists", id], ListRecord.create(localID))
  }
  getNode(id) {
    const localID = `${ this.name }:edge(${ id })`
    return this.getIn(["nodes", id], EdgeRecord.create(localID, this.type))
  }
  deleteNode(id) {
    return this.deleteIn(["nodes", id])
  }
  pushEdgesToList(id, nodes) {
    let nextState = this
      .list(id, (list) => list
        .update("edges", (edges) => edges.push(...nodes.map((edge) => edge.id)))
        .setStatusAsIdle()
      )
    return nodes.reduce((state, node) => state.node(node.id, (edge) => edge.setNodeValue(node)), nextState)
  }
  getComputedList(id) {
    return this.lists.get(id).update("edges", (edges) => edges.map((localID) => this.nodes[localID]))
  }
}

ResourceStoreRecord.create = (name, type) => {
  return new ResourceStoreRecord()
    .set("name", name)
    .set("type", type)
}

export default ResourceStoreRecord
