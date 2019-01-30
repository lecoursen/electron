// Copyright 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE.chromium file.

#ifndef NATIVE_MATE_OBJECT_TEMPLATE_BUILDER_H_
#define NATIVE_MATE_OBJECT_TEMPLATE_BUILDER_H_

#include "base/bind.h"
#include "base/callback.h"
#include "base/strings/string_piece.h"
#include "gin/object_template_builder.h"
#include "native_mate/converter.h"
#include "native_mate/function_template.h"
#include "v8/include/v8.h"

namespace mate {

namespace {

// Base template - used only for non-member function pointers. Other types
// either go to one of the below specializations, or go here and fail to compile
// because of base::Bind().
template <typename T, typename Enable = void>
struct CallbackTraits {
  static v8::Local<v8::FunctionTemplate> CreateTemplate(v8::Isolate* isolate,
                                                        T callback) {
    return mate::CreateFunctionTemplate(isolate, base::Bind(callback));
  }
};

// Specialization for base::Callback.
template <typename T>
struct CallbackTraits<base::Callback<T>> {
  static v8::Local<v8::FunctionTemplate> CreateTemplate(
      v8::Isolate* isolate,
      const base::Callback<T>& callback) {
    return mate::CreateFunctionTemplate(isolate, callback);
  }
};

// Specialization for member function pointers. We need to handle this case
// specially because the first parameter for callbacks to MFP should typically
// come from the the JavaScript "this" object the function was called on, not
// from the first normal parameter.
template <typename T>
struct CallbackTraits<
    T,
    typename std::enable_if<std::is_member_function_pointer<T>::value>::type> {
  static v8::Local<v8::FunctionTemplate> CreateTemplate(v8::Isolate* isolate,
                                                        T callback) {
    gin::InvokerOptions options;
    options.holder_is_first_argument = true;
    return mate::CreateFunctionTemplate(isolate, base::Bind(callback), options);
  }
};

// This specialization allows people to construct function templates directly if
// they need to do fancier stuff.
template <>
struct CallbackTraits<v8::Local<v8::FunctionTemplate>> {
  static v8::Local<v8::FunctionTemplate> CreateTemplate(
      v8::Local<v8::FunctionTemplate> templ) {
    return templ;
  }
};

}  // namespace

// ObjectTemplateBuilder provides a handy interface to creating
// v8::ObjectTemplate instances with various sorts of properties.
class ObjectTemplateBuilder : public gin::ObjectTemplateBuilder {
 public:
  explicit ObjectTemplateBuilder(v8::Isolate* isolate,
                                 v8::Local<v8::ObjectTemplate> templ);
  ~ObjectTemplateBuilder();

  using gin::ObjectTemplateBuilder::Build;
  using gin::ObjectTemplateBuilder::SetMethod;
  using gin::ObjectTemplateBuilder::SetProperty;
  // Add "destroy" and "isDestroyed" methods.
  ObjectTemplateBuilder& MakeDestroyable();
};

}  // namespace mate

#endif  // NATIVE_MATE_OBJECT_TEMPLATE_BUILDER_H_
