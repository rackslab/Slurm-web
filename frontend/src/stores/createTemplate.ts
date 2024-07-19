import { defineStore } from 'pinia'

export const useTemplateStore = defineStore('templateStore', {
  state: () => ({
    name: '',
    description: '',
    userAccounts: Array<string>,
    userLogins: Array<string>,
    developerAccounts: Array<string>,
    developerLogins: Array<string>
  }),
  actions: {
    resetTemplate() {
      ;(this.name = ''),
        (this.description = ''),
        (this.userAccounts = Array<string>),
        (this.userLogins = Array<string>),
        (this.developerAccounts = Array<string>),
        (this.developerLogins = Array<string>)
    }
  }
})
