#include "node.h"
#include "node_object_wrap.h"

namespace jit {

class ExecInfo : public node::ObjectWrap {
 public:
  ExecInfo(void* exec, size_t elen, void* guard, size_t glen);
  ~ExecInfo();

  static void Init(v8::Handle<v8::Object> target);

 protected:
  static void DeallocateRaw(char* data, void* hint);

  static v8::Handle<v8::Value> New(const v8::Arguments& args);
  static v8::Handle<v8::Value> Exec(const v8::Arguments& args);
  static v8::Handle<v8::Value> GetAbsoluteOffset(const v8::Arguments& args);

  void* exec_;
  void* guard_;
  size_t elen_;
  size_t glen_;
};

}  // namespace jit
