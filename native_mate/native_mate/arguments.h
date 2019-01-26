// Copyright 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE.chromium file.

#ifndef NATIVE_MATE_ARGUMENTS_H_
#define NATIVE_MATE_ARGUMENTS_H_

#include <type_traits>
#include "base/macros.h"
#include "gin/arguments.h"
#include "native_mate/converter.h"

namespace mate {

// Arguments is a wrapper around v8::FunctionCallbackInfo that integrates
// with Converter to make it easier to marshall arguments and return values
// between V8 and C++.
class Arguments : public gin::Arguments {
 public:
  Arguments();
  explicit Arguments(const v8::FunctionCallbackInfo<v8::Value>& info);
  ~Arguments();

  v8::Local<v8::Object> GetThis() { return mate_info_->This(); }

  using gin::Arguments::ThrowError;
  v8::Local<v8::Value> ThrowError(const std::string& message) const;

 private:
  const v8::FunctionCallbackInfo<v8::Value>* mate_info_;
};

}  // namespace mate

namespace gin {

// THIS IS NOT CORRECT, FIX IT NOW
template <>
struct Converter<mate::Arguments*> {
  static bool FromV8(v8::Isolate* isolate,
                     v8::Local<v8::Value> val,
                     mate::Arguments** out) {
    return true;
  }
};

}  // namespace gin

#endif  // NATIVE_MATE_ARGUMENTS_H_
