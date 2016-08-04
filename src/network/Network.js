// TODO: retries
// TODO: cancel
class Network {
  send(query) {
    return fetch(query.url, query)
      .then((res) => {
        if(res.ok) {
          return res.json()
        } else {
          return Promise.reject(res)
        }
      })
  }
}

export default Network
