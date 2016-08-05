let currentMutationID = -1

class Mutation {
  constructor(props) {
    this.id = ++currentMutationID
    this.props = props
  }
  __getConfigs(...args) {
    return this.getConfigs(...args).map((item) => Object.assign({ mutationID: this.id }, item))
  }
}

export default Mutation
