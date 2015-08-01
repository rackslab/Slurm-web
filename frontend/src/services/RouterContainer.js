let _router = null

export default {
  set: (router) => _router = router,
  get: () => _router
}

export default {
  set: (router) => _router = router,
  get: () => {
    return {
      transitionTo: (path) => {
        window.location = path
      },
      getCurrentQuery: () => {
        return {
          nextPath: '/jobs'
        }
      }
    }
  }
}
