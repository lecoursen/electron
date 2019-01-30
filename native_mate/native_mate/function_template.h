// Copyright 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE.chromium file.

#ifndef NATIVE_MATE_FUNCTION_TEMPLATE_H_
#define NATIVE_MATE_FUNCTION_TEMPLATE_H_

#include "base/callback.h"
#include "base/logging.h"
#include "gin/function_template.h"
#include "native_mate/arguments.h"
#include "native_mate/wrappable_base.h"
#include "v8/include/v8.h"

namespace mate {

namespace internal {

struct Destroyable {
  static void Destroy(Arguments* args) {
    if (IsDestroyed(args))
      return;

    v8::Local<v8::Object> holder;
    args->GetHolder(&holder);
    delete static_cast<mate::WrappableBase*>(
        holder->GetAlignedPointerFromInternalField(0));
    holder->SetAlignedPointerInInternalField(0, nullptr);
  }
  static bool IsDestroyed(Arguments* args) {
    v8::Local<v8::Object> holder;
    args->GetHolder(&holder);
    return holder->InternalFieldCount() == 0 ||
           holder->GetAlignedPointerFromInternalField(0) == nullptr;
  }
};

}  // namespace internal

using gin::CreateFunctionTemplate;

}  // namespace mate

#endif  // NATIVE_MATE_FUNCTION_TEMPLATE_H_
