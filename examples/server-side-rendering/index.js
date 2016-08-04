import React from "react"
import ReactDOMServer from "react-dom/server"
import { ReactStore, ReactStoreRoot, ReactStoreQuery, ReactStoreContainer, ReactStoreServer } from "../../src"
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

ReactStoreServer.getData(store, AContainer, { aWord: "a word", bWord: "b word" })
  .then(() => {
    console.log(
      ReactDOMServer.renderToString(
        <ReactStoreRoot
          Component={AContainer}
          store={store}
        />
      )
    )
  })
  .catch((err) => console.log(err))
