#include "node.h"
#include "node_object_wrap.h"

namespace jit {

class FunctionWrap : public node::ObjectWrap {
 public:
  FunctionWrap(void* exec) : exec_(exec) {
  }

  static void Init(v8::Handle<v8::Object> target);

 protected:
  static void DeallocateRaw(char* data, void* hint);

  static v8::Handle<v8::Value> New(const v8::Arguments& args);
  static v8::Handle<v8::Value> Exec(const v8::Arguments& args);

  void* exec_;
};

class Runtime : public node::ObjectWrap {
 public:
  Runtime(v8::Handle<v8::Function> fn);
  ~Runtime();

  static void Init(v8::Handle<v8::Object> target);

 protected:
  static v8::Handle<v8::Value> New(const v8::Arguments& args);
  static v8::Handle<v8::Value> GetCallAddress(const v8::Arguments& args);
  static v8::Handle<v8::Value> GetCallArgument(const v8::Arguments& args);
  intptr_t Invoke(intptr_t arg0, intptr_t arg1, intptr_t arg2, intptr_t arg3);

  v8::Persistent<v8::Function> fn_;
};

}  // namespace jit
