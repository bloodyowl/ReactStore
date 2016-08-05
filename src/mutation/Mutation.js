let currentMutationID = -1

class Mutation {
  constructor(props) {
    this.id = ++currentMutationID
    this.props = props
  }
  getFields() {
    return []
  }
  getOptimisticConfig() {
    return []
  }
  __getConfigs(...args) {
    return this.getConfigs(...args).map((item) => Object.assign({ mutationID: this.id }, item))
  }
  __getOptimisticConfig() {
    return this.getOptimisticConfig().map((item) => Object.assign({ mutationID: this.id, isOptimistic: true }, item))
  }
}

export default Mutation
