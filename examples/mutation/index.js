import React from "react"
import ReactDOM from "react-dom"
import { ReactStore, ReactStoreRoot, ReactStoreQuery, ReactStoreContainer, ReactStoreMutation } from "../../src"
import { Record } from "immutable"

const A = (props) => (
  <div>
    {props.foo.node.text}
    <BContainer />
  </div>
)

const B = (props) => (
  <div>
    {props.bar.node.text}
    <button onClick={() => props.store.commitUpdate(new ExampleMutation({ field: "foo", text: "lol" }))}>
      mutate
    </button>
  </div>
)

const AContainer = ReactStoreContainer.create(A, {
  queries: (props) => ({
    foo: new ExampleQuery({ field: "foo", text: props.aWord }),
    ...BContainer.getQueries(props),
  }),
  propsFromStore: (store, ownProps) => ({
    foo: store.foo,
  }),
})

const BContainer = ReactStoreContainer.create(B, {
  queries: (props) => ({
    bar: new ExampleQuery({ field: "bar", text: props.bWord }),
  }),
  propsFromStore: (store, ownProps) => ({
    bar: store.bar,
  }),
})

class ExampleQuery extends ReactStoreQuery {
  getQuery() {
    return {
      value: this.props.text,
    }
  }
  getConfigs(response) {
    return [
      { field: this.props.field, type: "CHANGE", value: response },
    ]
  }
}

class ExampleMutation extends ReactStoreMutation {
  getQuery() {
    return {
      value: this.props.text,
    }
  }
  getConfigs(response) {
    return [
      { field: this.props.field, type: "CHANGE", value: response }
    ]
  }
}

const TextRecord = Record({ text: "" })

const store = ReactStore.create({
  foo: ReactStore.type(TextRecord),
  bar: ReactStore.type(TextRecord),
})

const MockNetworkLayer = {
  send({ value }) {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ text: value.split("").reverse().join("") }), 300)
    })
  },
}

store.injectNetworkLayer(MockNetworkLayer)

ReactDOM.render(
  <ReactStoreRoot
    Component={AContainer}
    store={store}
    props={{ aWord: "a word", bWord: "b word" }}
  />,
  document.body.appendChild(document.createElement("div"))
)
