import React, { Component } from "react"

// TODO: Implement client side fetching on `componentDidMount`
class ReactStoreRoot extends Component {
  constructor(props) {
    super(props)
    this.state = {
      ready: false,
    }
  }
  getChildContext() {
    return {
      store: this.props.store,
    }
  }
  componentDidMount() {
    const { store, Component: ChildComponent, props } = this.props
    store.getData(ChildComponent, props)
      .then(() => {
        this.setState({
          ready: true,
        })
      })
  }
  render() {
    const { Component: ChildComponent } = this.props
    const { ready } = this.state
    if(!ready) {
      return null
    }
    return (
      <ChildComponent />
    )
  }
}

ReactStoreRoot.childContextTypes = {
  store: () => {},
}

export default ReactStoreRoot
