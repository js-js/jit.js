#include "jit.h"
#include "node_buffer.h"

#include <sys/mman.h>
#include <unistd.h>
#include <string.h>
#include <assert.h>

namespace jit {

using namespace v8;
using namespace node;

static Persistent<String> sym_buffer;
static size_t kPageSize;

typedef intptr_t (*JitFnArg0)(void);
typedef intptr_t (*JitFnArg1)(intptr_t);
typedef intptr_t (*JitFnArg2)(intptr_t, intptr_t);
typedef intptr_t (*JitFnArg3)(intptr_t, intptr_t, intptr_t);


static void DeallocateNop(char* data, void* hint) {
  // Do nothing
}


inline size_t RoundUp(size_t a, size_t b) {
  size_t mod = a % b;

  return mod == 0 ? a == 0 ? b : a : a + (b - mod);
}


ExecInfo::ExecInfo(void* exec, size_t elen, void* guard, size_t glen)
      : exec_(exec),
        guard_(guard),
        elen_(elen),
        glen_(glen) {
}


ExecInfo::~ExecInfo() {
  munmap(exec_, elen_);
  munmap(guard_, glen_);
}


Handle<Value> ExecInfo::New(const Arguments& args) {
  HandleScope scope;

  if (args.Length() < 1 ||
      !args[0]->IsObject() ||
      !Buffer::HasInstance(args[0].As<Object>())) {
    return ThrowException(Exception::TypeError(String::New(
        "First argument should be Buffer!")));
  }

  char* data = Buffer::Data(args[0].As<Object>());
  size_t len = Buffer::Length(args[0].As<Object>());

  size_t elen = RoundUp(len, kPageSize);
  void* exec = mmap(NULL,
                    elen,
                    PROT_READ | PROT_WRITE | PROT_EXEC,
                    MAP_ANON | MAP_PRIVATE,
                    -1,
                    0);
  if (exec == MAP_FAILED) {
    return ThrowException(Exception::TypeError(String::New(
        "Failed to mmap executable page")));
  }

  size_t glen = kPageSize;
  void* guard = mmap(reinterpret_cast<char*>(exec) + elen,
                     glen,
                     PROT_NONE,
                     MAP_ANON | MAP_PRIVATE,
                     -1,
                     0);
  if (guard == MAP_FAILED) {
    munmap(exec, elen);
    return ThrowException(Exception::TypeError(String::New(
        "Failed to mmap guard page")));
  }

  // Copy code into it
  memcpy(exec, data, len);

  // Fill rest with 0xcc
  memset(reinterpret_cast<char*>(exec) + len, 0xcc, elen - len);

  ExecInfo* info = new ExecInfo(exec, elen, guard, glen);
  info->Wrap(args.This());

  Buffer* buf = Buffer::New(reinterpret_cast<char*>(exec),
                            elen,
                            DeallocateNop,
                            info);
  args.This()->Set(sym_buffer, buf->handle_, ReadOnly);

  return scope.Close(args.This());
}


Handle<Value> ExecInfo::Exec(const Arguments& args) {
  HandleScope scope;

  ExecInfo* info = ObjectWrap::Unwrap<ExecInfo>(args.This());

  intptr_t ret;
  switch (args.Length()) {
   case 0:
    ret = reinterpret_cast<JitFnArg0>(info->exec_)();
    break;
   case 1:
    ret = reinterpret_cast<JitFnArg1>(info->exec_)(args[0]->IntegerValue());
    break;
   case 2:
    ret = reinterpret_cast<JitFnArg2>(info->exec_)(args[0]->IntegerValue(),
                                                   args[1]->IntegerValue());
    break;
   case 3:
    ret = reinterpret_cast<JitFnArg3>(info->exec_)(args[0]->IntegerValue(),
                                                   args[1]->IntegerValue(),
                                                   args[2]->IntegerValue());
    break;
   default:
    return ThrowException(Exception::TypeError(String::New(
        "Can't execute function with more than 3 arguments")));
  }

  return Number::New(ret);
}


Handle<Value> ExecInfo::GetAbsoluteOffset(const Arguments& args) {
  HandleScope scope;

  ExecInfo* info = ObjectWrap::Unwrap<ExecInfo>(args.This());

  if (args.Length() < 1 || !args[0]->IsNumber()) {
    return ThrowException(Exception::TypeError(String::New(
        "First argument should be a Number!")));
  }

  intptr_t addr = reinterpret_cast<intptr_t>(info->exec_);
  addr += args[0]->IntegerValue();

  return Buffer::New(reinterpret_cast<char*>(&addr), sizeof(addr))->handle_;
}


Handle<Value> ExecInfo::GetPointer(const Arguments& args) {
  HandleScope scope;

  if (args.Length() < 1 ||
      !args[0]->IsObject() ||
      !Buffer::HasInstance(args[0].As<Object>())) {
    return ThrowException(Exception::TypeError(String::New(
        "First argument should be Buffer!")));
  }

  char* data = Buffer::Data(args[0].As<Object>());

  return Buffer::New(reinterpret_cast<char*>(&data), sizeof(&data))->handle_;
}


void ExecInfo::Init(Handle<Object> target) {
  HandleScope scope;

  sym_buffer = Persistent<String>::New(String::NewSymbol("buffer"));
  kPageSize = sysconf(_SC_PAGE_SIZE);

  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  t->InstanceTemplate()->SetInternalFieldCount(1);

  NODE_SET_PROTOTYPE_METHOD(t, "exec", Exec);
  NODE_SET_PROTOTYPE_METHOD(t, "getAbsoluteOffset", GetAbsoluteOffset);

  target->Set(String::NewSymbol("ExecInfo"), t->GetFunction());

  NODE_SET_METHOD(target, "getPointer", GetPointer);
}

} // namespace jit

NODE_MODULE(jit, jit::ExecInfo::Init);
