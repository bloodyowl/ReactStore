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
    return this.updateIn(["nodes", id], EdgeRecord.create(localID), cb)
  }
  list(id, cb) {
    const localID = `${ this.name }:list(${ id })`
    return this.updateIn(["nodes", id], ListRecord.create(localID), cb)
  }
  getComputedList(id) {
    return this.lists.get(id).update("edges", (edges) => edges.map((localID) => this.nodes[localID]))
  }
}

ResourceStoreRecord.create = (name, type) => {
  return new ResourceStoreRecord()
    .set("name", name)
    .set("NodeConstructor", type)
}

export default ResourceStoreRecord
