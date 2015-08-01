import React from 'react/addons'
import Radium from 'radium'
import ReactMixin from 'react-mixin'
import Auth from '../../services/AuthService'


// for packing logo
require('../../assets/images/logo.png')

const debug = require('debug')('slurm-web:Login.js')

const styles = {
  base: {
    padding: '20px 40px'
  },
  form: {
  },
  formGroup: {
    textAlign: 'center'
  },
  input: {
    margin: '0 auto',
    width: '200px'
  }
}

@Radium
export default class Login extends React.Component {

  constructor () {
    super()
    this.state = {
      user: '',
      password: ''
    }
  }

  // This will be called when the user clicks on the login button
  login (e) {
    e.preventDefault()
    // Here, we call an external AuthService. We’ll create it in the next step
    Auth.login(this.state.user, this.state.password)
      .catch( (err) => {
        // alert("There's an error logging in")
        debug('Error logging in', err)
      })
  }

  render () {

    return (
      <div id='login' className='main' style={[styles.base]}>
        <h1 className='page-header'>Login</h1>
        <form className="form" role="form" style={[styles.form]}>
          <div className="form-group" style={[styles.formGroup]}>
            <img src="/images/logo.png" style={[styles.input]} />
          </div>
          <div className="form-group" style={[styles.formGroup]}>
            <input
              type="text"
              className="form-control"
              valueLink={this.linkState('user')}
              placeholder="Username"
              style={[styles.input]} />
          </div>
          <div className="form-group" style={[styles.formGroup]}>
            <input
              type="password"
              className="form-control"
              valueLink={this.linkState('password')}
              placeholder="Password"
              style={[styles.input]} />
          </div>
          <div className="form-group" style={[styles.formGroup]}>
            <button
              type="submit"
              className="btn btn-primary"
              onClick={this.login.bind(this)}
              style={[styles.input]}>
              Login
            </button>
          </div>
        </form>
      </div>
    )
  }
}

// We’re using the mixin `LinkStateMixin` to have two-way databinding
// between our component and the HTML.
ReactMixin(Login.prototype, React.addons.LinkedStateMixin)
