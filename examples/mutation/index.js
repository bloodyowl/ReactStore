import React from "react"
import ReactDOM from "react-dom"
import { ReactStore, ReactStoreRoot, ReactStoreQuery, ReactStoreContainer, ReactStoreMutation } from "../../src"
import { Record } from "immutable"

const A = (props) => (
  <div>
    <span style={{ opacity: props.foo.loading ? 0.5 : 1, color: props.foo.error ? "red" : undefined }}>
      {props.foo.node.text}
    </span>
    <BContainer />
  </div>
)

const B = (props) => (
  <div>
    {props.bar.node.text}
    <button onClick={() => props.store.commitUpdate(new ExampleMutation({ field: "foo", text: "ok" }))}>
      mutation that succeeds
    </button>
    <button onClick={() => props.store.commitUpdate(new ExampleMutation({ field: "foo", text: "lol" }))}>
      mutation that fails
    </button>
    <button onClick={() => props.store.commitUpdate(new ExampleMutationWithOptimisticUpdate({ field: "foo", text: "optimistic" }))}>
      mutation with optimistic update
    </button>
    <button onClick={() => props.store.commitUpdate(new ExampleMutationWithOptimisticUpdate({ field: "foo", text: "lol" }))}>
      mutation with optimistic update that fails
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

class ExampleMutationWithOptimisticUpdate extends ReactStoreMutation {
  getQuery() {
    return {
      value: this.props.text,
    }
  }
  getOptimisticConfig() {
    return [
      { field: this.props.field, type: "CHANGE", value: { text: this.props.text } }
    ]
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
    return new Promise((resolve, reject) => {
      if(value === "lol") {
        setTimeout(() => reject({}), 1000)
      } else {
        setTimeout(() => resolve({ text: value.split("").reverse().join("") }), 1000)
      }
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
