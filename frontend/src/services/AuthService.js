import request from 'reqwest'
import when from 'when'
import { LOGIN_URL, LOGOUT_URL } from '../constants'
import LoginActions from '../actions/LoginActions'

const debug = require('debug')('slurm-web:AuthService.js')

class AuthService {

  login (username, password) {
    return this.handleAuth(when(request({
      url: LOGIN_URL,
      method: 'POST',
      crossOrigin: true,
      type: 'json',
      data: {
        username, password
      }
    })))
  }

  logout () {
    this.handleAuth(when(request({
      url: LOGOUT_URL,
      method: 'POST',
      crossOrigin: true,
      type: 'json',
      data: {
        // username
      }
    })))

    LoginActions.logoutUser()
  }

  handleAuth (loginPromise) {
    return loginPromise
      .then((response) => {
        debug('handleAuth(loginPromise) response :', response)
        let jwt = response.id_token
        LoginActions.loginUser(jwt)
        return true
      })
  }
}

export default new AuthService()
