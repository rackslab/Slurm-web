import { defineStore } from 'pinia'

export const useTemplateStore = defineStore('templateStore', {
  state: () => ({
    name: '',
    description: '',
    userAccounts: [] as string[],
    userLogins: [] as string[],
    developerAccounts: [] as string[],
    developerLogins: [] as string[]
  }),
  actions: {
    resetTemplate() {
      ;(this.name = ''),
        (this.description = ''),
        (this.userAccounts = []),
        (this.userLogins = []),
        (this.developerAccounts = []),
        (this.developerLogins = [])
    }
  }
})
