class Query {
  constructor(props) {
    this.props = props
  }
  shouldQuery(state) {
    return true
  }
  __getConfigs(...args) {
    return this.getConfigs(...args)
  }
}

export default Query
