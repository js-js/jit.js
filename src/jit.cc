#include "jit.h"
#include "nan.h"
#include "node_buffer.h"

#include <unistd.h>
#include <string.h>
#include <stdlib.h>
#include <assert.h>

namespace jit {

using namespace v8;

typedef intptr_t (*JitFnArg0)(void);
typedef intptr_t (*JitFnArg1)(intptr_t);
typedef intptr_t (*JitFnArg2)(intptr_t, intptr_t);
typedef intptr_t (*JitFnArg3)(intptr_t, intptr_t, intptr_t);
typedef intptr_t (*JitFnArg4)(intptr_t, intptr_t, intptr_t, intptr_t);
typedef intptr_t (*JitFnArg5)(intptr_t, intptr_t, intptr_t, intptr_t, intptr_t);


static inline Local<Object> GetPointerBuffer(void* ptr) {
  return Nan::CopyBuffer(reinterpret_cast<char*>(&ptr), sizeof(&ptr))
      .ToLocalChecked();
}


NAN_METHOD(FunctionWrap::New) {
  Nan::HandleScope();

  if (info.Length() < 1 ||
      !info[0]->IsObject() ||
      !node::Buffer::HasInstance(info[0])) {
    return Nan::ThrowError("First argument should be Buffer!");
  }

  char* exec = node::Buffer::Data(Nan::To<Object>(info[0]).ToLocalChecked());

  FunctionWrap* wrap = new FunctionWrap(exec);
  wrap->Wrap(info.This());

  info.This()->Set(Nan::New("buffer").ToLocalChecked(), info[0]);

  info.GetReturnValue().Set(info.This());
}


static intptr_t ToPtr(Local<Value> arg) {
  if (arg->IsObject() && node::Buffer::HasInstance(arg))
    return *reinterpret_cast<intptr_t*>(node::Buffer::Data(arg));
  else
    return arg->IntegerValue();
}


NAN_METHOD(FunctionWrap::Exec) {
  Nan::HandleScope();

  FunctionWrap* wrap = ObjectWrap::Unwrap<FunctionWrap>(info.This());

  intptr_t ret;
  switch (info.Length()) {
   case 0:
    ret = reinterpret_cast<JitFnArg0>(wrap->exec_)();
    break;
   case 1:
    ret = reinterpret_cast<JitFnArg1>(wrap->exec_)(ToPtr(info[0]));
    break;
   case 2:
    ret = reinterpret_cast<JitFnArg2>(wrap->exec_)(ToPtr(info[0]),
                                                   ToPtr(info[1]));
    break;
   case 3:
    ret = reinterpret_cast<JitFnArg3>(wrap->exec_)(ToPtr(info[0]),
                                                   ToPtr(info[1]),
                                                   ToPtr(info[2]));
    break;
   case 4:
    ret = reinterpret_cast<JitFnArg4>(wrap->exec_)(ToPtr(info[0]),
                                                   ToPtr(info[1]),
                                                   ToPtr(info[2]),
                                                   ToPtr(info[3]));
    break;
   case 5:
    ret = reinterpret_cast<JitFnArg5>(wrap->exec_)(ToPtr(info[0]),
                                                   ToPtr(info[1]),
                                                   ToPtr(info[2]),
                                                   ToPtr(info[3]),
                                                   ToPtr(info[4]));
    break;
   default:
    return Nan::ThrowError("Can't execute function with more than 3 arguments");
  }

  info.GetReturnValue().Set(Nan::New<Number>(ret));
}


void FunctionWrap::Init(Handle<Object> target) {
  Nan::HandleScope();

  Local<FunctionTemplate> t = Nan::New<FunctionTemplate>(New);
  t->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetPrototypeMethod(t, "exec", Exec);

  target->Set(Nan::New("FunctionWrap").ToLocalChecked(), t->GetFunction());
}


Runtime::Runtime(Local<Function> fn) : callback_(fn) {
}


NAN_METHOD(Runtime::New) {
  Nan::HandleScope();

  if (info.Length() < 1 || !info[0]->IsFunction()) {
    return Nan::ThrowError("First argument should be a Function!");
  }

  Runtime* rt = new Runtime(info[0].As<Function>());
  rt->Wrap(info.This());

  info.GetReturnValue().Set(info.This());
}


NAN_METHOD(Runtime::GetCallAddress) {
  Nan::HandleScope();

  intptr_t (jit::Runtime::* invoke)(intptr_t, intptr_t, intptr_t, intptr_t,
                                    intptr_t, intptr_t);
  invoke = &Runtime::Invoke;

  info.GetReturnValue().Set(
      GetPointerBuffer(*reinterpret_cast<void**>(&invoke)));
}


NAN_METHOD(Runtime::GetCallArgument) {
  Nan::HandleScope();

  Runtime* rt = ObjectWrap::Unwrap<Runtime>(info.This());

  info.GetReturnValue().Set(GetPointerBuffer(reinterpret_cast<void*>(rt)));
}


intptr_t Runtime::Invoke(intptr_t arg0,
                         intptr_t arg1,
                         intptr_t arg2,
                         intptr_t arg3,
                         intptr_t arg4,
                         intptr_t arg5) {
  Nan::HandleScope();

  intptr_t info[] = { arg0, arg1, arg2, arg3, arg4, arg5 };
  Local<Value> argv[6];
  for (int i = 0; i < 6; i++)
    argv[i] = GetPointerBuffer(reinterpret_cast<void*>(info[i]));

  Nan::TryCatch try_catch;
  try_catch.SetVerbose(true);
  Local<Value> res = callback_.Call(6, argv);
  if (try_catch.HasCaught()) {
    Nan::FatalException(try_catch);
    abort();
  }

  if (res->IsObject() && node::Buffer::HasInstance(res))
    return *reinterpret_cast<intptr_t*>(node::Buffer::Data(res));
  else
    return static_cast<intptr_t>(res->Int32Value());
}

void Runtime::Init(Handle<Object> target) {
  Nan::HandleScope();

  Local<FunctionTemplate> t = Nan::New<FunctionTemplate>(New);
  t->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetPrototypeMethod(t, "getCallAddress", GetCallAddress);
  Nan::SetPrototypeMethod(t, "getCallArgument", GetCallArgument);

  target->Set(Nan::New("Runtime").ToLocalChecked(), t->GetFunction());
}


static void Init(Handle<Object> target) {
  FunctionWrap::Init(target);
  Runtime::Init(target);
}

} // namespace jit

NODE_MODULE(jit, jit::Init);
