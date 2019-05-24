// Copyright (c) 2019 GitHub, Inc.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file.

#include "atom/common/api/atom_api_cpu_profiler.h"

#include <vector>

#include "native_mate/dictionary.h"
#include "native_mate/object_template_builder.h"

namespace {

v8::Local<v8::Value> SerializeNode(v8::Isolate* isolate,
                                   const v8::CpuProfileNode* node) {
  mate::Dictionary dict = mate::Dictionary::CreateEmpty(isolate);
  dict.SetHidden("simple", true);
  dict.Set("functionName", node->GetFunctionName());
  dict.Set("url", node->GetScriptResourceName());
  dict.Set("lineNumber", node->GetLineNumber());
  dict.Set("callUID", node->GetCallUid());
  dict.Set("bailoutReason", node->GetBailoutReason());
  dict.Set("id", node->GetNodeId());
  dict.Set("scriptId", node->GetScriptId());
  dict.Set("hitCount", node->GetHitCount());

  int count = node->GetChildrenCount();
  std::vector<v8::Local<v8::Value>> children(count);

  for (int index = 0; index < count; index++) {
    children[index] = SerializeNode(isolate, node->GetChild(index));
  }

  dict.Set("children", children);

  return dict.GetHandle();
}

v8::Local<v8::Value> SerializeProfile(v8::Isolate* isolate,
                                      v8::CpuProfile* profile) {
  mate::Dictionary dict = mate::Dictionary::CreateEmpty(isolate);
  dict.SetHidden("simple", true);
  dict.Set("typeId", "CPU");
  dict.Set("title", profile->GetTitle());
  dict.Set("startTime", static_cast<double>(profile->GetStartTime()));
  dict.Set("endTime", static_cast<double>(profile->GetEndTime()));
  dict.Set("head", SerializeNode(isolate, profile->GetTopDownRoot()));

  int count = profile->GetSamplesCount();
  std::vector<unsigned> samples(count);
  std::vector<double> timestamps(count);

  for (int index = 0; index < count; index++) {
    samples[index] = profile->GetSample(index)->GetNodeId();
    timestamps[index] = static_cast<double>(profile->GetSampleTimestamp(index));
  }

  dict.Set("samples", samples);
  dict.Set("timestamps", timestamps);

  return dict.GetHandle();
}

}  // namespace

namespace atom {

namespace api {

CpuProfiler::CpuProfiler(v8::Isolate* isolate, v8::Local<v8::Object> wrapper) {
  InitWith(isolate, wrapper);

  profiler_ = v8::CpuProfiler::New(isolate);
}

CpuProfiler::~CpuProfiler() {
  if (profiler_)
    profiler_->Dispose();
}

// static
mate::WrappableBase* CpuProfiler::New(mate::Arguments* args) {
  return new CpuProfiler(args->isolate(), args->GetThis());
}

// static
void CpuProfiler::BuildPrototype(v8::Isolate* isolate,
                                 v8::Local<v8::FunctionTemplate> prototype) {
  prototype->SetClassName(mate::StringToV8(isolate, "CpuProfiler"));
  mate::ObjectTemplateBuilder(isolate, prototype->PrototypeTemplate())
      .MakeDestroyable()
      .SetMethod("startProfiling", &CpuProfiler::StartProfiling)
      .SetMethod("stopProfiling", &CpuProfiler::StopProfiling)
      .SetMethod("setSamplingInterval", &CpuProfiler::SetSamplingInterval)
      .SetMethod("setUsePreciseSampling", &CpuProfiler::SetUsePreciseSampling);
}

void CpuProfiler::StartProfiling(v8::Isolate* isolate,
                                 const std::string& title) {
  profiler_->StartProfiling(mate::StringToV8(isolate, title), true);
}

v8::Local<v8::Value> CpuProfiler::StopProfiling(v8::Isolate* isolate,
                                                const std::string& title) {
  auto* profile = profiler_->StopProfiling(mate::StringToV8(isolate, title));
  auto result = SerializeProfile(isolate, profile);
  profile->Delete();
  return result;
}

void CpuProfiler::SetSamplingInterval(int us) {
  profiler_->SetSamplingInterval(us);
}

void CpuProfiler::SetUsePreciseSampling(bool value) {
  profiler_->SetUsePreciseSampling(value);
}

}  // namespace api

}  // namespace atom

namespace {

using atom::api::CpuProfiler;

void Initialize(v8::Local<v8::Object> exports,
                v8::Local<v8::Value> unused,
                v8::Local<v8::Context> context,
                void* priv) {
  v8::Isolate* isolate = context->GetIsolate();
  CpuProfiler::SetConstructor(isolate, base::BindRepeating(&CpuProfiler::New));

  mate::Dictionary dict(isolate, exports);
  dict.Set("CpuProfiler", CpuProfiler::GetConstructor(isolate)
                              ->GetFunction(context)
                              .ToLocalChecked());
}

}  // namespace

NODE_LINKED_MODULE_CONTEXT_AWARE(atom_common_cpu_profiler, Initialize)
