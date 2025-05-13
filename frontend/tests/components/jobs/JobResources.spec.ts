import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JobResources from '@/components/jobs/JobResources.vue'
import jobs from '../../assets/jobs.json'

describe('JobResources.vue', () => {
  test('job with gpus', () => {
    const job = { ...jobs[0] }
    job.node_count.number = 4
    job.cpus.number = 16
    job.gres_detail = ['gpu:h100:2(IDX:2-3)']
    const wrapper = mount(JobResources, {
      props: {
        job: job
      }
    })
    const items = wrapper.findAll('span')
    expect(items.length).toBe(3)
    expect(items[0].text()).toBe('4')
    expect(items[1].text()).toBe('16')
    expect(items[2].text()).toBe('2')
  })
  test('job without gpus', () => {
    const job = { ...jobs[0] }
    job.node_count.number = 2
    job.cpus.number = 8
    job.gres_detail = []
    const wrapper = mount(JobResources, {
      props: {
        job: job
      }
    })
    const items = wrapper.findAll('span')
    expect(items.length).toBe(2)
    expect(items[0].text()).toBe('2')
    expect(items[1].text()).toBe('8')
  })
  test('job with gpus unreliable', () => {
    const job = { ...jobs[0] }
    job.node_count.number = 4
    job.cpus.number = 16
    job.gres_detail = []
    job.tres_per_socket = 'gres/gpu:2'
    job.sockets_per_node.set = true
    job.sockets_per_node.number = 2
    const wrapper = mount(JobResources, {
      props: {
        job: job
      }
    })
    const items = wrapper.findAll('span')
    expect(items.length).toBe(4)
    expect(items[0].text()).toBe('4')
    expect(items[1].text()).toBe('16')
    expect(items[2].text()).toBe('16 ~')
    expect(items[3].text()).toBe('~')
  })
})
