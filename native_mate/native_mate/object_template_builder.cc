// Copyright 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE.chromium file.

#include "native_mate/object_template_builder.h"

namespace mate {

ObjectTemplateBuilder::ObjectTemplateBuilder(
    v8::Isolate* isolate,
    v8::Local<v8::ObjectTemplate> templ)
    : gin::ObjectTemplateBuilder(isolate, templ) {}

ObjectTemplateBuilder::~ObjectTemplateBuilder() {}

ObjectTemplateBuilder& ObjectTemplateBuilder::MakeDestroyable() {
  SetMethod("destroy", base::Bind(internal::Destroyable::Destroy));
  SetMethod("isDestroyed", base::Bind(internal::Destroyable::IsDestroyed));
  return *this;
}

}  // namespace mate
