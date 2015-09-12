#include "nan.h"

namespace jit {

class FunctionWrap : public Nan::ObjectWrap {
 public:
  FunctionWrap(void* exec) : exec_(exec) {
  }

  static void Init(v8::Handle<v8::Object> target);

 protected:
  static void DeallocateRaw(char* data, void* hint);

  static NAN_METHOD(New);
  static NAN_METHOD(Exec);

  void* exec_;
};

class Runtime : public Nan::ObjectWrap {
 public:
  Runtime(v8::Local<v8::Function> fn);

  static void Init(v8::Handle<v8::Object> target);

 protected:
  static NAN_METHOD(New);
  static NAN_METHOD(GetCallAddress);
  static NAN_METHOD(GetCallArgument);
  intptr_t Invoke(intptr_t arg0, intptr_t arg1, intptr_t arg2, intptr_t arg3,
                  intptr_t arg4, intptr_t arg5);

  Nan::Callback callback_;
};

}  // namespace jit
