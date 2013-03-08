#include <v8.h>
#include <node.h>
#include <node_buffer.h>
#include <sys/mman.h>
#include <unistd.h>
#include <string.h>
#include <assert.h>

namespace jit {

using namespace v8;
using namespace node;

class ExecInfo : public ObjectWrap {
 public:
  typedef intptr_t (*cbarg0)(void);
  typedef intptr_t (*cbarg1)(Local<Value>);
  typedef intptr_t (*cbarg2)(Local<Value>, Local<Value>);
  typedef intptr_t (*cbarg3)(Local<Value>, Local<Value>, Local<Value>);

  ExecInfo(void* exec, size_t elen, void* guard, size_t glen)
      : exec_(exec),
        elen_(elen),
        guard_(guard),
        glen_(glen) {
    if (obj_template_.IsEmpty()) {
      Local<ObjectTemplate> o = ObjectTemplate::New();
      o->SetInternalFieldCount(1);
      obj_template_ = Persistent<ObjectTemplate>::New(o);
    }

    if (sym_execinfo_.IsEmpty()) {
      sym_execinfo_ = Persistent<String>::New(String::NewSymbol("_execinfo"));
    }
    if (sym_raw_.IsEmpty()) {
      sym_raw_ = Persistent<String>::New(String::NewSymbol("raw"));
    }
  }

  ~ExecInfo() {
    munmap(exec_, elen_);
    munmap(guard_, glen_);
  }

  Handle<Function> GetFunction() {
    HandleScope scope;

    Local<FunctionTemplate> t = FunctionTemplate::New(Exec);
    Local<Function> fn = t->GetFunction();

    Local<Object> obj = obj_template_->NewInstance();
    Wrap(obj);

    fn->Set(sym_execinfo_, obj);

    Buffer* buf = Buffer::New(reinterpret_cast<char*>(exec_),
                              elen_,
                              DeallocateRaw,
                              this);
    fn->Set(sym_raw_, buf->handle_);

    return scope.Close(t->GetFunction());
  }

 protected:
  static Handle<Value> Exec(const Arguments& args) {
    HandleScope scope;

    assert(args.Callee()->IsFunction());
    Local<Function> fn = args.Callee().As<Function>();

    assert(fn->Has(sym_execinfo_));
    Local<Object> info_obj = fn->Get(sym_execinfo_).As<Object>();
    ExecInfo* info = ObjectWrap::Unwrap<ExecInfo>(info_obj);

    intptr_t ret;
    switch (args.Length()) {
     case 0:
      ret = reinterpret_cast<cbarg0>(info->exec_)();
      break;
     case 1:
      ret = reinterpret_cast<cbarg1>(info->exec_)(args[0]);
      break;
     case 2:
      ret = reinterpret_cast<cbarg2>(info->exec_)(args[0], args[1]);
      break;
     default:
      ret = reinterpret_cast<cbarg3>(info->exec_)(args[0], args[1], args[2]);
      break;
    }

    return Number::New(ret);
  }

  static void DeallocateRaw(char* data, void* hint) {
    // Do nothing
  }

  void* exec_;
  size_t elen_;
  void* guard_;
  size_t glen_;

  static Persistent<ObjectTemplate> obj_template_;
  static Persistent<String> sym_execinfo_;
  static Persistent<String> sym_raw_;
};


Persistent<ObjectTemplate> ExecInfo::obj_template_;
Persistent<String> ExecInfo::sym_execinfo_;
Persistent<String> ExecInfo::sym_raw_;


inline size_t GetPageSize() {
  return sysconf(_SC_PAGE_SIZE);
}


inline size_t RoundUp(size_t a, size_t b) {
  size_t mod = a % b;

  return mod == 0 ? a == 0 ? b : a : a + (b - mod);
}


ExecInfo* AllocateGuarded(char* data, size_t len) {
  size_t elen = RoundUp(len, GetPageSize());
  void* exec = mmap(NULL,
                    elen,
                    PROT_READ | PROT_WRITE | PROT_EXEC,
                    MAP_ANON | MAP_PRIVATE,
                    -1,
                    0);
  if (exec == MAP_FAILED) return NULL;

  size_t glen = GetPageSize();
  void* guard = mmap(reinterpret_cast<char*>(exec) + elen,
                     glen,
                     PROT_NONE,
                     MAP_ANON | MAP_PRIVATE,
                     -1,
                     0);
  if (guard == MAP_FAILED) {
    munmap(exec, elen);
    return NULL;
  }

  // Copy code into it
  memcpy(exec, data, len);

  // Fill rest with 0xcc
  memset(reinterpret_cast<char*>(exec) + len, 0xcc, elen - len);

  return new ExecInfo(exec, elen, guard, glen);
}


Handle<Value> Wrap(const Arguments& args) {
  HandleScope scope;

  if (args.Length() < 1 || !args[0]->IsObject() ||
      !Buffer::HasInstance(args[0].As<Object>())) {
    return ThrowException(Exception::TypeError(String::New(
        "First argument should be Buffer!")));
  }

  char* data = Buffer::Data(args[0].As<Object>());
  size_t len = Buffer::Length(args[0].As<Object>());

  return scope.Close(AllocateGuarded(data, len)->GetFunction());
}


static void Init(Handle<Object> target) {
  NODE_SET_METHOD(target, "wrap", Wrap);
}

} // namespace jit

NODE_MODULE(jit, jit::Init);
