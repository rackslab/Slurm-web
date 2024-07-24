import { defineStore } from 'pinia'

export const useInputStore = defineStore('inputStore', {
  state: () => ({
    name: '',
    description: '',
    default: '',
    minMax: { min: '', max: '' },
    minVal: '',
    maxVal: '',
    regex: '',
    type: '',
    inputs: [] as Array<{
      name: string
      description: string
      default: string
      minVal: string
      maxVal: string
      regex: string
      type: string
    }>
  }),
  actions: {
    addInput() {
      const newInput = {
        name: this.name,
        description: this.description,
        default: this.default,
        minVal: this.minVal,
        maxVal: this.maxVal,
        regex: this.regex,
        type: this.type
      }
      this.inputs.push(newInput)
      this.resetInput()
    },
    resetInput() {
      ;(this.name = ''),
        (this.description = ''),
        (this.type = ''),
        (this.default = ''),
        (this.minVal = ''),
        (this.maxVal = ''),
        (this.regex = '')
    }
  }
})
