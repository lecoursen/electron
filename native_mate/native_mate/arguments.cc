// Copyright 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE.chromium file.

#include "native_mate/arguments.h"

#include "base/strings/stringprintf.h"
#include "native_mate/converter.h"

using namespace gin;

namespace mate {

Arguments::Arguments() : gin::Arguments() {}

Arguments::Arguments(const v8::FunctionCallbackInfo<v8::Value>& info)
    : gin::Arguments(info), mate_info_(&info) {}

Arguments::~Arguments() {}

v8::Local<v8::Value> Arguments::ThrowError(const std::string& message) const {
  auto* isolate = mate_info_->GetIsolate();
  isolate->ThrowException(
      v8::Exception::Error(gin::StringToV8(isolate, message)));
  return v8::Undefined(isolate);
}

}  // namespace mate
