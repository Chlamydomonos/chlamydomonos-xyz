---
title: Hello World
---

# Chlamydomonos的博客

时隔数年，我终于复活了Chlamydomonos的博客。之前的博客使用Hexo为框架，主题由ejs书写，可谓非常难以维护。更可怕的是，当时的我对前端还是几乎一窍不通，而且没有AI的帮助。为了实现博客页面，我的代码中充满各种屎山。因此，我也很长时间没有更新博客。

直到2025年夏天，我开始写自己的个人网站：[Chlamydomonos.xyz](/)。我本来打算使用Vuepress作为静态页面生成器，但在学习过程中发现它也有许多局限性。我索性放弃了现成框架，使用Vue手搓框架。

个人网站完成后，我就开始尝试把博客也整合进来。由于2025年下半年我比较忙碌，终于在2026年初完成了这一壮举。使用Vue实现的博客基本包含了原来博客的各种功能，Vue的引入也使页面的动态效果更容易制作。

<!-- more -->

当然，在实现博客的过程中，我也使用了许多在Hexo里使用过的库，比如`kramed`，`highlight.js`，`mathjax`等。

## 代码高亮测试

```c++
#include <iostream>

using namespace std;

int main() {
    cout << "Hello World" << endl;
    return 0;
}
```

## 公式测试

公式：

$$
e^{i \pi} + 1 = 0
$$

行内公式：$y = e^x$

## 评论

评论功能的实现由utterances改为了Giscus。这一库具有Vue支持。