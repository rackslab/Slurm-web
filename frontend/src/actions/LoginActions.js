import Dispatcher from '../dispatchers/Dispatcher.js'
import { LOGIN_USER, LOGOUT_USER } from '../constants'
import RouterContainer from '../services/RouterContainer'

export default {
  loginUser: (jwt) => {
    let savedJwt = localStorage.getItem('jwt')

    Dispatcher.dispatch({
      actionType: LOGIN_USER,
      jwt: jwt
    })

    if (savedJwt !== jwt) {
      console.log('LoginActions savedJwt !== jwt', jwt)
      let nextPath = RouterContainer.get().getCurrentQuery().nextPath || '/'

      localStorage.setItem('jwt', jwt)
      RouterContainer.get().transitionTo(nextPath)
    }
  },
  logoutUser: () => {
    RouterContainer.get().transitionTo('/login')
    localStorage.removeItem('jwt')
    Dispatcher.dispatch({
      actionType: LOGOUT_USER
    })
  }
}
