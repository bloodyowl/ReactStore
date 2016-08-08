import { Record, List } from "immutable"

const RawListRecord = Record({
  id: null,
  edges: List(),
  status: "idle",
  error: null,
  hasNextPage: false,
  hasPreviousPage: false,
})

class ListRecord extends RawListRecord {
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
  pushEdges(...edges) {
    return this
      .setStatusAsIdle()
      .update("edges", (e) => e.push(...edges))
  }
}

ListRecord.create = (id) => {
  return new ListRecord().set("id", id)
}

export default ListRecord
