#include "node.h"
#include "node_object_wrap.h"
#include "nan.h"

namespace jit {

class FunctionWrap : public node::ObjectWrap {
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

class Runtime : public node::ObjectWrap {
 public:
  Runtime(v8::Handle<v8::Function> fn);
  ~Runtime();

  static void Init(v8::Handle<v8::Object> target);

 protected:
  static NAN_METHOD(New);
  static NAN_METHOD(GetCallAddress);
  static NAN_METHOD(GetCallArgument);
  intptr_t Invoke(intptr_t arg0, intptr_t arg1, intptr_t arg2, intptr_t arg3);

  v8::Persistent<v8::Function> fn_;
};

}  // namespace jit
