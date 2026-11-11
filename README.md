# Writeshaper

Fix and polish your writing in any app, privately. Free and open source, for Mac and Windows.

Select text anywhere, press **⌥ Space** (Mac) or **Alt + Shift + Space** (Windows), and Writeshaper fixes the mistakes, or makes it clearer, shorter, friendlier or more professional, or translates it. **Replace** pastes the new version back. The Write tab checks as you type.

Everything runs on your own computer: the writing model ([Qwen3.5 4B](https://huggingface.co/Qwen), Apache 2.0) runs locally with [llama.cpp](https://github.com/ggml-org/llama.cpp) (MIT). Your text is never uploaded.

**Website and downloads:** https://hollowbit.dev/writeshaper/

## Develop

```bash
npm install
npm run llama      # downloads the llama.cpp server builds into vendor/
npm start          # or: npm run demo (made-up answers, no model needed)
npm test           # engine + end-to-end + packaged app (needs the model downloaded)
npm run accuracy   # 12 sentences with known mistakes
npm run dist       # Mac (arm64 + Intel) and Windows installers
npm run site       # builds the website into docs/
```

Made by Hollowbit Studio · MIT licence
