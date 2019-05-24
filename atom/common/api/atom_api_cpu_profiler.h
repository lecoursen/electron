// Copyright (c) 2019 GitHub, Inc.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file.

#ifndef ATOM_COMMON_API_ATOM_API_CPU_PROFILER_H_
#define ATOM_COMMON_API_ATOM_API_CPU_PROFILER_H_

#include <string>

#include "atom/browser/api/trackable_object.h"
#include "atom/common/node_includes.h"
#include "v8/include/v8-profiler.h"

namespace atom {

namespace api {

class CpuProfiler : public mate::TrackableObject<CpuProfiler> {
 public:
  static mate::WrappableBase* New(mate::Arguments* args);

  static void BuildPrototype(v8::Isolate* isolate,
                             v8::Local<v8::FunctionTemplate> prototype);

 protected:
  CpuProfiler(v8::Isolate* isolate, v8::Local<v8::Object> wrapper);
  ~CpuProfiler() override;

 private:
  void StartProfiling(v8::Isolate* isolate, const std::string& title);
  v8::Local<v8::Value> StopProfiling(v8::Isolate* isolate,
                                     const std::string& title);
  void SetSamplingInterval(int us);
  void SetUsePreciseSampling(bool value);

  v8::CpuProfiler* profiler_ = nullptr;

  DISALLOW_COPY_AND_ASSIGN(CpuProfiler);
};

}  // namespace api

}  // namespace atom

#endif  // ATOM_COMMON_API_ATOM_API_CPU_PROFILER_H_
