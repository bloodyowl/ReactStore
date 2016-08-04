# ReactStore

```javascript
import React from "react"
import ReactDOM from "react-dom"
import { ReactStore, ReactStoreDefaultNetwork, ReactStoreRoot, ReactStoreQuery, ReactStoreContainer } from "../../src"
import { Record } from "immutable"

const UserRecord = Record({
  id: null,
  username: "",
})

const store = ReactStore.create({
  users: ReactStore.resource(UserRecord),
})

store.injectNetworkLayer(new ReactStoreDefaultNetwork("https://api.foo.bar"))

const UserDetails = ({ user }) => (
  <div>
    {user.username}
  </div>
)

const UserDetailsContainer = ReactStoreContainer.create(UserDetails, {
  queries: (props) => ({
    user: new UserQuery({ id: props.userID })
  }),
  propsFromStore: (store, ownProps) => ({
    user: store.users.nodes.getNode(ownProps.userID),
  }),
})

class UserQuery extends ReactStoreQuery {
  getQuery() {
    return {
      path: `/users/${ this.props.id }`,
    }
  }
  getConfigs(response) {
    return [
      { field: "users", id: this.props.id, type: "CHANGE_NODE", value: response },
    ]
  }
}

ReactDOM.render(
  <ReactStoreRoot
    Component={UserDetailsContainer}
    store={store}
    props={{
      userID: 123,
    }}
  />,
  document.getElementById("container")
)
```
