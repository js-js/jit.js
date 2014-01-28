#include "jit.h"
#include "node_buffer.h"

#include <unistd.h>
#include <string.h>
#include <assert.h>

namespace jit {

using namespace v8;
using namespace node;

static Persistent<String> sym_buffer;

typedef intptr_t (*JitFnArg0)(void);
typedef intptr_t (*JitFnArg1)(intptr_t);
typedef intptr_t (*JitFnArg2)(intptr_t, intptr_t);
typedef intptr_t (*JitFnArg3)(intptr_t, intptr_t, intptr_t);


inline Buffer* GetPointerBuffer(void* ptr) {
  return Buffer::New(reinterpret_cast<char*>(&ptr), sizeof(&ptr));
}


Handle<Value> FunctionWrap::New(const Arguments& args) {
  HandleScope scope;

  if (args.Length() < 1 ||
      !args[0]->IsObject() ||
      !Buffer::HasInstance(args[0].As<Object>())) {
    return ThrowException(Exception::TypeError(String::New(
        "First argument should be Buffer!")));
  }

  char* exec = Buffer::Data(args[0].As<Object>());

  FunctionWrap* wrap = new FunctionWrap(exec);
  wrap->Wrap(args.This());

  args.This()->Set(sym_buffer, args[0], ReadOnly);

  return scope.Close(args.This());
}


Handle<Value> FunctionWrap::Exec(const Arguments& args) {
  HandleScope scope;

  FunctionWrap* wrap = ObjectWrap::Unwrap<FunctionWrap>(args.This());

  intptr_t ret;
  switch (args.Length()) {
   case 0:
    ret = reinterpret_cast<JitFnArg0>(wrap->exec_)();
    break;
   case 1:
    ret = reinterpret_cast<JitFnArg1>(wrap->exec_)(args[0]->IntegerValue());
    break;
   case 2:
    ret = reinterpret_cast<JitFnArg2>(wrap->exec_)(args[0]->IntegerValue(),
                                                   args[1]->IntegerValue());
    break;
   case 3:
    ret = reinterpret_cast<JitFnArg3>(wrap->exec_)(args[0]->IntegerValue(),
                                                   args[1]->IntegerValue(),
                                                   args[2]->IntegerValue());
    break;
   default:
    return ThrowException(Exception::TypeError(String::New(
        "Can't execute function with more than 3 arguments")));
  }

  return Number::New(ret);
}


void FunctionWrap::Init(Handle<Object> target) {
  HandleScope scope;

  sym_buffer = Persistent<String>::New(String::NewSymbol("buffer"));

  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  t->InstanceTemplate()->SetInternalFieldCount(1);

  NODE_SET_PROTOTYPE_METHOD(t, "exec", Exec);

  target->Set(String::NewSymbol("FunctionWrap"), t->GetFunction());
}


Runtime::Runtime(Handle<Function> fn) {
  fn_ = Persistent<Function>::New(fn);
}


Runtime::~Runtime() {
  fn_.Dispose();
  fn_.Clear();
}


Handle<Value> Runtime::New(const Arguments& args) {
  HandleScope scope;

  if (args.Length() < 1 || !args[0]->IsFunction()) {
    return ThrowException(Exception::TypeError(String::New(
        "First argument should be a Function!")));
  }

  Runtime* rt = new Runtime(args[0].As<Function>());
  rt->Wrap(args.This());

  return scope.Close(args.This());
}


Handle<Value> Runtime::GetCallAddress(const Arguments& args) {
  HandleScope scope;

  intptr_t (jit::Runtime::* invoke)(intptr_t, intptr_t, intptr_t, intptr_t);
  invoke = &Runtime::Invoke;

  return scope.Close(GetPointerBuffer(
      *reinterpret_cast<void**>(&invoke))->handle_);
}


Handle<Value> Runtime::GetCallArgument(const Arguments& args) {
  HandleScope scope;

  Runtime* rt = ObjectWrap::Unwrap<Runtime>(args.This());

  return scope.Close(GetPointerBuffer(reinterpret_cast<void*>(rt))->handle_);
}


intptr_t Runtime::Invoke(intptr_t arg0,
                         intptr_t arg1,
                         intptr_t arg2,
                         intptr_t arg3) {
  HandleScope scope;

  intptr_t args[] = { arg0, arg1, arg2, arg3 };
  Handle<Value> argv[4];
  for (int i = 0; i < 4; i++) {
    if (args[i] == 0)
      argv[i] = Number::New(0);
    else
      argv[i] = GetPointerBuffer(reinterpret_cast<void*>(args[i]))->handle_;
  }

  Local<Value> res = fn_->Call(Null().As<Object>(), 4, argv);

  return static_cast<intptr_t>(res->IntegerValue());
}

void Runtime::Init(Handle<Object> target) {
  HandleScope scope;

  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  t->InstanceTemplate()->SetInternalFieldCount(1);

  NODE_SET_PROTOTYPE_METHOD(t, "getCallAddress", GetCallAddress);
  NODE_SET_PROTOTYPE_METHOD(t, "getCallArgument", GetCallArgument);

  target->Set(String::NewSymbol("Runtime"), t->GetFunction());
}


static void Init(Handle<Object> target) {
  FunctionWrap::Init(target);
  Runtime::Init(target);
}

} // namespace jit

NODE_MODULE(jit, jit::Init);
