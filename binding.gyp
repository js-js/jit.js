{
  "targets": [
    {
      "target_name": "jit",

      "include_dirs": [
        "src",
        "<!(node -e \"require('nan')\")",
      ],

      "sources": [
        "src/jit.cc",
      ],
    }
  ]
}
