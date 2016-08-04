import { Record, List } from "immutable"

const RawEdgeRecord = Record({
  id: null,
  type: new Record({}),
  node: null,
  status: "idle",
  error: null,
})

class EdgeRecord extends RawEdgeRecord {
  setStatusAsLoading() {
    return this.set("status", "loading")
  }
  setStatusAsErrored(error) {
    return this
      .set("status", "error")
      .set("error", error)
  }
  setStatusAsIdle() {
    return this.set("status", "idle")
  }
  get loading() {
    return this.status === "loading"
  }
  get error() {
    return this.status === "error"
  }
  get idle() {
    return this.status === "idle"
  }
  setNodeValue(node) {
    return this
      .set("node", this.type.from ? this.type.from(node) : new this.type(node))
      .setStatusAsIdle()
  }
}

EdgeRecord.create = (id, type) => {
  return new EdgeRecord()
    .set("id", id)
    .set("type", type)
}

export default EdgeRecord
