#include "jit.h"
#include "node_buffer.h"
#include "nan.h"

#include <unistd.h>
#include <string.h>
#include <stdlib.h>
#include <assert.h>

namespace jit {

using namespace v8;
using namespace node;

typedef intptr_t (*JitFnArg0)(void);
typedef intptr_t (*JitFnArg1)(intptr_t);
typedef intptr_t (*JitFnArg2)(intptr_t, intptr_t);
typedef intptr_t (*JitFnArg3)(intptr_t, intptr_t, intptr_t);


static inline Handle<Object> GetPointerBuffer(void* ptr) {
  return NanNewBufferHandle(reinterpret_cast<char*>(&ptr), sizeof(&ptr));
}


NAN_METHOD(FunctionWrap::New) {
  NanScope();

  if (args.Length() < 1 ||
      !args[0]->IsObject() ||
      !Buffer::HasInstance(args[0])) {
    return NanThrowError("First argument should be Buffer!");
  }

  char* exec = Buffer::Data(args[0].As<Object>());

  FunctionWrap* wrap = new FunctionWrap(exec);
  wrap->Wrap(args.This());

  args.This()->Set(NanNew("buffer"), args[0], ReadOnly);

  NanReturnValue(args.This());
}


NAN_METHOD(FunctionWrap::Exec) {
  NanScope();

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
    return NanThrowError("Can't execute function with more than 3 arguments");
  }

  return Number::New(ret);
}


void FunctionWrap::Init(Handle<Object> target) {
  NanScope();

  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  t->InstanceTemplate()->SetInternalFieldCount(1);

  NODE_SET_PROTOTYPE_METHOD(t, "exec", Exec);

  target->Set(NanNew("FunctionWrap"), t->GetFunction());
}


Runtime::Runtime(Handle<Function> fn) {
  NanAssignPersistent(fn_, fn);
}


Runtime::~Runtime() {
  NanDisposePersistent(fn_);
}


NAN_METHOD(Runtime::New) {
  NanScope();

  if (args.Length() < 1 || !args[0]->IsFunction()) {
    return NanThrowError("First argument should be a Function!");
  }

  Runtime* rt = new Runtime(args[0].As<Function>());
  rt->Wrap(args.This());

  NanReturnValue(args.This());
}


NAN_METHOD(Runtime::GetCallAddress) {
  NanScope();

  intptr_t (jit::Runtime::* invoke)(intptr_t, intptr_t, intptr_t, intptr_t,
                                    intptr_t, intptr_t);
  invoke = &Runtime::Invoke;

  NanReturnValue(GetPointerBuffer(*reinterpret_cast<void**>(&invoke)));
}


NAN_METHOD(Runtime::GetCallArgument) {
  NanScope();

  Runtime* rt = ObjectWrap::Unwrap<Runtime>(args.This());

  NanReturnValue(GetPointerBuffer(reinterpret_cast<void*>(rt)));
}


intptr_t Runtime::Invoke(intptr_t arg0,
                         intptr_t arg1,
                         intptr_t arg2,
                         intptr_t arg3,
                         intptr_t arg4,
                         intptr_t arg5) {
  NanScope();

  intptr_t args[] = { arg0, arg1, arg2, arg3, arg4, arg5 };
  Handle<Value> argv[6];
  for (int i = 0; i < 6; i++)
    argv[i] = GetPointerBuffer(reinterpret_cast<void*>(args[i]));

  TryCatch try_catch;
  try_catch.SetVerbose(true);
  Local<Value> res = fn_->Call(NanNull().As<Object>(), 6, argv);
  if (try_catch.HasCaught()) {
    node::FatalException(try_catch);
    abort();
  }

  if (res->IsObject() && Buffer::HasInstance(res))
    return *reinterpret_cast<intptr_t*>(Buffer::Data(res));
  else
    return static_cast<intptr_t>(res->Int32Value());
}

void Runtime::Init(Handle<Object> target) {
  NanScope();

  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  t->InstanceTemplate()->SetInternalFieldCount(1);

  NODE_SET_PROTOTYPE_METHOD(t, "getCallAddress", GetCallAddress);
  NODE_SET_PROTOTYPE_METHOD(t, "getCallArgument", GetCallArgument);

  target->Set(NanNew("Runtime"), t->GetFunction());
}


static void Init(Handle<Object> target) {
  FunctionWrap::Init(target);
  Runtime::Init(target);
}

} // namespace jit

NODE_MODULE(jit, jit::Init);
