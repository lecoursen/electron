'use strict'

const { CpuProfiler } = process.electronBinding('cpu_profiler')

module.exports = CpuProfiler
