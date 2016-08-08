import React from "react"
import ReactDOM from "react-dom"
import { Record } from "immutable"
import { ReactStoreRoot, ReactStoreContainer, ReactStoreQuery, ReactStore } from "../../src"

const A = ({ list, setVariables, variables }) => (
  <div>
    <ul>
      {list.edges.map(({ id, node }) =>
        <li key={id}>
          {node.text}
        </li>
      )}
    </ul>
    {list.loading &&
      "loading …"
    }
    <button onClick={() => setVariables({ first: variables.first + 10 })}>
      load more
    </button>
  </div>
)

const AContainer = ReactStoreContainer.create(A, {
  initialVariables: {
    first: 10,
  },
  queries: (props, { first }) => ({
    list: new ListQuery({ sort: "ASC", first: first }),
  }),
  propsFromStore: (store) => ({
    list: store.list.getList("ASC")
      .update("edges", (edges) => edges.map((id) => store.list.getNode(id))),
  }),
})

let id = -1

class ListQuery extends ReactStoreQuery {
  getQuery(state) {
    return {
      sort: this.props.sort,
      elements: Array.from({
        length: this.props.first - state.list.getIn(["list", this.props.sort, "edges", "length"], 0),
      }, () => ({ id: ++id, text: String(Math.random()) }))
    }
  }
  getConfigs(response) {
    return [
      { field: "list", type: "RANGE_ADD", id: this.props.sort, value: response },
    ]
  }
}

const TextRecord = Record({
  id: null,
  text: "",
})

const store = ReactStore.create({
  list: ReactStore.resource(TextRecord),
})


const MockNetworkLayer = {
  send({ elements }) {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(elements), 1000)
    })
  },
}

store.injectNetworkLayer(MockNetworkLayer)

ReactDOM.render(
  <ReactStoreRoot
    Component={AContainer}
    store={store}
  />,
  document.body.appendChild(document.createElement("div"))
)
