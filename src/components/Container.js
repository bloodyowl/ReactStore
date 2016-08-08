import React, { Component } from "react"

const Container = {
  create(ReactComponent, config) {
    class ReactStoreContainer extends Component {
      constructor(props) {
        super(props)
        this.forceUpdate = this.forceUpdate.bind(this)
        this.state = config.initialVariables
        this.setVariables = (nextState) => {
          const { store } = this.context
          this.setState(nextState, () => {
            store.getData(ReactStoreContainer, this.props, this.state)
          })
        }
      }
      componentDidMount() {
        const { store } = this.context
        this.unsubscribe = store.subscribe(this.forceUpdate)
      }
      componentWillUnmount() {
        this.unsubscribe()
      }
      // TODO: Implement `variables`, `setVariables` & `forceFetch`
      // TODO: Implement deferred loading on `componentDidMount` if not merged with parent component
      render() {
        const { store } = this.context
        return (
          <ReactComponent
            {...this.props}
            {...config.propsFromStore(store.getState(), this.props)}
            store={store}
            setVariables={this.setVariables}
            variables={this.state}
          />
        )
      }
    }
    ReactStoreContainer.getQueries = config.queries
    ReactStoreContainer.propsFromStore = config.propsFromStore
    ReactStoreContainer.getInitialVariables = () => config.initialVariables || {}
    ReactStoreContainer.contextTypes = {
      store: () => {},
    }
    return ReactStoreContainer
  },
}

export default Container
