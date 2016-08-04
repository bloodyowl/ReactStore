import React, { Component } from "react"

// TODO: Implement client side fetching on `componentDidMount`
class ReactStoreRoot extends Component {
  getChildContext() {
    return {
      store: this.props.store,
    }
  }
  render() {
    const { Component: ChildComponent } = this.props
    return (
      <ChildComponent />
    )
  }
}

ReactStoreRoot.childContextTypes = {
  store: () => {},
}

export default ReactStoreRoot
