import { EventEmitter } from 'events'
import Dispatcher from '../dispatchers/Dispatcher'
import { LOGIN_USER, LOGOUT_USER } from '../constants'

// const debug = require('debug')('slurm-web:LoginStore.js')

export default class LoginStore extends EventEmitter {

  constructor () {
    super()
    this.subscribe(() => this._registerToActions.bind(this))
    this._user = null
    this._jwt = null
  }

  subscribe (actionSubscribe) {
    this._dispatchToken = Dispatcher.register(actionSubscribe())
  }

  get dispatchToken () {
    return this._dispatchToken
  }

  emitChange () {
    this.emit('CHANGE')
  }

  addChangeListener (cb) {
    this.on('CHANGE', cb)
  }

  removeChangeListener (cb) {
    this.removeListener('CHANGE', cb)
  }

  _registerToActions (action) {
    switch(action.actionType) {
      case LOGIN_USER:
        // TODO: get user infos from API
        this._user = 'user'
        this._jwt = action.jwt
        this.emitChange()
        break
      case LOGOUT_USER:
        this._user = null
        this.emitChange()
        break
      default:
        break
    }
  }

  get user () {
    return this._user
  }

  get jwt () {
    return this._jwt
  }

  isLoggedIn () {
    return !!this._user
  }
}

export default new LoginStore()
