/**
 * Codeforces Markdown Copy - Content Script
 * 将 Codeforces 题目转换为 Markdown 并复制到剪贴板
 */

(function () {
  'use strict';

  // ========== HTML → Markdown 转换工具 ==========

  /**
   * 简易 HTML → Markdown 转换器
   * 针对 Codeforces 题目页面结构优化
   */
  function htmlToMarkdown(element) {
    if (!element) return '';

    const clone = element.cloneNode(true);

    // MathJax v2 会保留原始 script，并额外生成预览、渲染和辅助节点。
    // 仅保留 script 中的原始 LaTeX，避免同一公式被转换多次。
    clone.querySelectorAll(
      '.MathJax_Preview, .MathJax, .MJX_Assistive_MathML'
    ).forEach(node => node.remove());

    return nodeToMarkdown(clone).trim();
  }

  /**
   * 检查文本是否包含 Unicode 数学字符
   * Unicode 数学字母数字符号范围：U+1D400 - U+1D7FF
   */
  function containsUnicodeMath(text) {
    return /[\u{1D400}-\u{1D7FF}]/u.test(text);
  }

  /**
   * 清理文本中的 Unicode 数学字符，只保留普通字符
   */
  function cleanMathText(text) {
    // 移除 Unicode 数学字符，保留空格、运算符和普通字符
    return text.replace(/[\u{1D400}-\u{1D7FF}]/ug, '');
  }

  function nodeToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      // 跳过 MathJax 辅助文本节点
      if (node.parentElement) {
        const parent = node.parentElement;
        // 跳过 MathJax 辅助元素中的文本
        if (parent.classList.contains('MJX_Assistive_MathML') ||
            parent.closest('.MJX_Assistive_MathML')) {
          return '';
        }
        // 跳过包含 Unicode 数学字符的文本节点（MathJax 渲染输出）
        if (parent.classList.contains('MathJax') || 
            parent.closest('.MathJax')) {
          if (containsUnicodeMath(text)) {
            return '';
          }
        }
      }
      return text;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();

    // ========== MathJax v2 专门处理 ==========
    // Codeforces 使用 MathJax v2，结构为：
    // <span class="MathJax">...</span>
    // <script type="math/tex">原始LaTeX</script>
    
    // 1. 直接处理 script[type="math/tex"] - 最高优先级
    // 展示公式的 type 可能为 "math/tex; mode=display"。
    if (tag === 'script' && node.getAttribute('type')?.startsWith('math/tex')) {
      const tex = node.textContent.trim();
      return node.getAttribute('type').includes('mode=display')
        ? `\n\n$$\n${tex}\n$$\n\n`
        : `$${tex}$`;
    }

    // 2. 跳过 MathJax 辅助元素
    if (node.classList.contains('MJX_Assistive_MathML')) {
      return '';
    }

    // 3. 处理 MathJax 主容器
    if (tag === 'span' && node.classList.contains('MathJax')) {
      // 查找关联的 script 标签（通过 ID）
      const frameId = node.getAttribute('id'); // 例如 "MathJax-Element-20-Frame"
      if (frameId) {
        const scriptId = frameId.replace('-Frame', ''); // "MathJax-Element-20"
        const script = document.getElementById(scriptId);
        if (script && script.getAttribute('type') === 'math/tex') {
          return `$${script.textContent}$`;
        }
      }
      
      // 备选：查找同级的 script 标签
      let sibling = node.nextSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE &&
            sibling.tagName.toLowerCase() === 'script' &&
            sibling.getAttribute('type') === 'math/tex') {
          return `$${sibling.textContent}$`;
        }
        sibling = sibling.nextSibling;
      }
      
      // 如果找不到 script，跳过这个容器（避免输出 Unicode）
      return '';
    }

    // ========== MathJax v3 兼容处理 ==========
    if (tag === 'mjx-container') {
      const script = node.querySelector('script[type="math/tex"]');
      if (script) return `$${script.textContent}$`;
      
      const annotation = node.querySelector('annotation[encoding="application/x-tex"]');
      if (annotation) return `$${annotation.textContent}$`;
      
      const altText = node.getAttribute('alt');
      if (altText) return `$${altText}$`;
      
      return '';
    }

    const children = Array.from(node.childNodes)
      .map(nodeToMarkdown)
      .join('');

    switch (tag) {
      // 数学公式：保持原始 LaTeX 标记
      case 'span':
        if (node.classList.contains('tex')) {
          // 已被上面的 MathJax 处理覆盖，这里作为 fallback
          const script = node.querySelector('script[type="math/tex"]');
          if (script) return `$${script.textContent}$`;
          
          const mjxContainer = node.querySelector('mjx-container');
          if (mjxContainer) return nodeToMarkdown(mjxContainer);
          
          const annotation = node.querySelector('annotation[encoding="application/x-tex"]');
          if (annotation) return `$${annotation.textContent}$`;
          
          return children;
        }
        
        if (node.classList.contains('math') || node.classList.contains('tex-math')) {
          return `$${node.textContent}$`;
        }
        
        return children;

      // 标题
      case 'h1': return `\n\n# ${children.trim()}\n\n`;
      case 'h2': return `\n\n## ${children.trim()}\n\n`;
      case 'h3': return `\n\n### ${children.trim()}\n\n`;
      case 'h4': return `\n\n#### ${children.trim()}\n\n`;

      // 段落和换行
      case 'p': return `\n\n${children.trim()}\n\n`;
      case 'br': return '\n';
      case 'hr': return '\n\n---\n\n';

      // 文本格式
      case 'strong':
      case 'b':
        return `**${children.trim()}**`;
      case 'em':
      case 'i':
        return `*${children.trim()}*`;
      case 'u':
        return `<u>${children.trim()}</u>`;
      case 'del':
      case 's':
        return `~~${children.trim()}~~`;
      case 'code':
        return `\`${node.textContent}\``;
      case 'sup':
        return `<sup>${children}</sup>`;
      case 'sub':
        return `<sub>${children}</sub>`;
      case 'pre':
        return `\n\n\`\`\`\n${node.textContent}\n\`\`\`\n\n`;

      // 列表
      case 'ul': {
        const items = Array.from(node.children)
          .map(li => `- ${nodeToMarkdown(li).trim()}`)
          .join('\n');
        return `\n\n${items}\n\n`;
      }
      case 'ol': {
        const items = Array.from(node.children)
          .map((li, i) => `${i + 1}. ${nodeToMarkdown(li).trim()}`)
          .join('\n');
        return `\n\n${items}\n\n`;
      }
      case 'li':
        return children;

      // 链接和图片
      case 'a': {
        const href = node.getAttribute('href');
        return href ? `[${children.trim()}](${href})` : children;
      }
      case 'img': {
        const src = node.getAttribute('src');
        const alt = node.getAttribute('alt') || '';
        return src ? `![${alt}](${src})` : '';
      }

      // 表格
      case 'table':
        return convertTable(node);

      // 引用
      case 'blockquote': {
        const lines = children.trim().split('\n');
        return '\n\n' + lines.map(l => `> ${l}`).join('\n') + '\n\n';
      }

      // div、span 等容器直接返回子内容
      default:
        return children;
    }
  }

  /**
   * 将 HTML 表格转换为 Markdown 表格
   */
  function convertTable(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    const result = [];
    const colCount = Math.max(
      ...rows.map(r => r.querySelectorAll('td, th').length)
    );

    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      const cellTexts = cells.map(c => nodeToMarkdown(c).trim().replace(/\|/g, '\\|').replace(/\n/g, ' '));
      // 补齐列
      while (cellTexts.length < colCount) cellTexts.push('');
      result.push(`| ${cellTexts.join(' | ')} |`);

      // 表头后插入分隔行
      if (rowIndex === 0) {
        result.push(`| ${Array(colCount).fill('---').join(' | ')} |`);
      }
    });

    return `\n\n${result.join('\n')}\n\n`;
  }

  // ========== Codeforces 题目解析 ==========

  /**
   * 提取题目正文。
   * Codeforces 的题干通常是 .problem-statement 的直接子节点，并不带
   * .description 类；只排除后续会单独格式化的结构化部分。
   */
  function extractDescription(problemDiv) {
    const content = problemDiv.cloneNode(true);
    Array.from(content.children).forEach(child => {
      if (child.matches('.header, .input-specification, .output-specification, .sample-tests, .note')) {
        child.remove();
      }
    });
    return htmlToMarkdown(content);
  }

  /**
   * 从 Codeforces 页面提取题目内容
   */
  function extractProblem() {
    const problemDiv = document.querySelector('.problem-statement');
    if (!problemDiv) return null;

    const parts = {};

    // 标题
    const header = problemDiv.querySelector('.header');
    if (header) {
      const titleEl = header.querySelector('.title');
      parts.title = titleEl
        ? titleEl.textContent.trim()
        : header.textContent.trim();
    }

    // 题目描述：兼容旧页面的 .description，以及没有该类名的新页面结构。
    const description = problemDiv.querySelector(':scope > .description');
    parts.description = description
      ? htmlToMarkdown(description)
      : extractDescription(problemDiv);

    // 时间/内存限制（从头部分析）
    if (header) {
      const timeLimit = header.querySelector('.time-limit');
      const memLimit = header.querySelector('.memory-limit');
      const inputType = header.querySelector('.input-file');
      const outputType = header.querySelector('.output-file');
      parts.limits = {};
      if (timeLimit) parts.limits.time = timeLimit.textContent.replace('time limit per test', '').trim();
      if (memLimit) parts.limits.memory = memLimit.textContent.replace('memory limit per test', '').trim();
      if (inputType) parts.limits.input = inputType.textContent.replace('input', '').trim();
      if (outputType) parts.limits.output = outputType.textContent.replace('output', '').trim();
    }

    // 输入格式
    const inputSpec = problemDiv.querySelector('.input-specification');
    parts.inputSpec = inputSpec ? htmlToMarkdown(inputSpec) : '';

    // 输出格式
    const outputSpec = problemDiv.querySelector('.output-specification');
    parts.outputSpec = outputSpec ? htmlToMarkdown(outputSpec) : '';

    // 样例
    parts.samples = [];
    const sampleTests = problemDiv.querySelector('.sample-tests');
    if (sampleTests) {
      const inputs = sampleTests.querySelectorAll('.input');
      const outputs = sampleTests.querySelectorAll('.output');
      
      for (let i = 0; i < Math.max(inputs.length, outputs.length); i++) {
        const inputContent = inputs[i] ? inputs[i].querySelector('pre') || inputs[i].querySelector('.content') : null;
        const outputContent = outputs[i] ? outputs[i].querySelector('pre') || outputs[i].querySelector('.content') : null;
        
        parts.samples.push({
          input: inputContent ? inputContent.textContent.trim() : '',
          output: outputContent ? outputContent.textContent.trim() : '',
        });
      }
    }

    // 注释/提示
    const note = problemDiv.querySelector('.note');
    parts.note = note ? htmlToMarkdown(note) : '';

    return parts;
  }

  /**
   * 方案 2：后处理清理重复的数学公式
   */
  function cleanDuplicateFormulas(markdown) {
    // 1. 清理完全相同的连续公式：$abc$$abc$ -> $abc$
    markdown = markdown.replace(/(\$[^$]+\$)(\1)+/g, '$1');
    
    // 2. 清理紧挨着的相似公式（可能是不同格式）
    // 例如：$𝑡$$t$ 或 $1≤t≤104$$1 \le t \le 10^4$
    markdown = markdown.replace(/(\$[^$]+\$)(\$[^$]+\$)/g, (match, formula1, formula2) => {
      const content1 = formula1.slice(1, -1).replace(/\s/g, '');
      const content2 = formula2.slice(1, -1).replace(/\s/g, '');
      
      // 如果两个公式内容完全相同（忽略空格），只保留第二个
      if (content1 === content2) {
        return formula2;
      }
      
      // 如果第一个包含 Unicode 数学字符，第二个不包含，保留第二个
      if (containsUnicodeMath(content1) && !containsUnicodeMath(content2)) {
        return formula2;
      }
      
      // 如果第二个是第一个的子串或更完整版本，保留第二个
      if (content1.length > 0 && content2.includes(content1)) {
        return formula2;
      }
      
      // 否则保持原样
      return match;
    });
    
    // 3. 再次清理可能产生的连续重复
    markdown = markdown.replace(/(\$[^$]+\$)(\1)+/g, '$1');
    
    return markdown;
  }

  /**
   * 将提取的题目数据格式化为 Markdown
   */
  function formatMarkdown(problem) {
    if (!problem) return '';

    const lines = [];

    // 标题
    lines.push(`# ${problem.title}`);
    lines.push('');

    // 限制信息
    if (problem.limits) {
      const limitParts = [];
      if (problem.limits.time) limitParts.push(`**时间限制**：${problem.limits.time}`);
      if (problem.limits.memory) limitParts.push(`**内存限制**：${problem.limits.memory}`);
      if (problem.limits.input) limitParts.push(`**输入**：${problem.limits.input}`);
      if (problem.limits.output) limitParts.push(`**输出**：${problem.limits.output}`);
      if (limitParts.length > 0) {
        lines.push(limitParts.join(' | '));
        lines.push('');
      }
    }

    // 题目描述
    if (problem.description) {
      lines.push(problem.description);
      lines.push('');
    }

    // 输入格式
    if (problem.inputSpec) {
      lines.push('## 输入');
      lines.push('');
      lines.push(problem.inputSpec);
      lines.push('');
    }

    // 输出格式
    if (problem.outputSpec) {
      lines.push('## 输出');
      lines.push('');
      lines.push(problem.outputSpec);
      lines.push('');
    }

    // 样例
    if (problem.samples.length > 0) {
      lines.push('## 样例');
      lines.push('');
      problem.samples.forEach((sample, index) => {
        lines.push(`### 样例 ${index + 1}`);
        lines.push('');
        lines.push('**输入**');
        lines.push('');
        lines.push('```');
        lines.push(sample.input);
        lines.push('```');
        lines.push('');
        lines.push('**输出**');
        lines.push('');
        lines.push('```');
        lines.push(sample.output);
        lines.push('```');
        lines.push('');
      });
    }

    // 注释/提示
    if (problem.note) {
      lines.push('## 提示');
      lines.push('');
      lines.push(problem.note);
      lines.push('');
    }

    // 方案 2：应用后处理清理
    let markdown = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
    markdown = cleanDuplicateFormulas(markdown);
    
    return markdown;
  }

  // ========== UI 注入 ==========

  /**
   * 创建复制按钮
   */
  function createCopyButton() {
    const btn = document.createElement('button');
    btn.id = 'cf-md-copy-btn';
    btn.textContent = '📋 复制 Markdown';
    btn.title = '将题目复制为 Markdown 格式';
    btn.addEventListener('click', handleCopy);
    return btn;
  }

  /**
   * 创建复制成功的提示
   */
  function showToast(message, isError = false) {
    const existing = document.getElementById('cf-md-copy-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'cf-md-copy-toast';
    toast.textContent = message;
    toast.className = isError ? 'cf-md-toast cf-md-toast-error' : 'cf-md-toast cf-md-toast-success';
    document.body.appendChild(toast);

    // 触发动画
    requestAnimationFrame(() => {
      toast.classList.add('cf-md-toast-show');
    });

    setTimeout(() => {
      toast.classList.remove('cf-md-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /**
   * 复制按钮点击处理
   */
  async function handleCopy() {
    const btn = document.getElementById('cf-md-copy-btn');
    if (!btn) return;

    btn.classList.add('cf-md-copying');
    btn.textContent = '⏳ 转换中...';

    try {
      const problem = extractProblem();
      if (!problem) {
        showToast('❌ 未找到题目内容', true);
        return;
      }

      const markdown = formatMarkdown(problem);

      // 使用 Clipboard API 复制
      await navigator.clipboard.writeText(markdown);

      // 成功反馈
      btn.textContent = '✅ 已复制!';
      showToast('✅ Markdown 已复制到剪贴板');

      setTimeout(() => {
        btn.textContent = '📋 复制 Markdown';
        btn.classList.remove('cf-md-copying');
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);

      // 尝试 fallback：使用 textarea
      try {
        const problem = extractProblem();
        const markdown = formatMarkdown(problem);
        fallbackCopy(markdown);
        btn.textContent = '✅ 已复制!';
        showToast('✅ Markdown 已复制到剪贴板');
        setTimeout(() => {
          btn.textContent = '📋 复制 Markdown';
          btn.classList.remove('cf-md-copying');
        }, 2000);
      } catch (fallbackErr) {
        showToast('❌ 复制失败，请手动复制', true);
        btn.textContent = '📋 复制 Markdown';
        btn.classList.remove('cf-md-copying');
      }
    }
  }

  /**
   * 复制的 fallback 方法（使用 textarea）
   */
  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!success) throw new Error('execCommand copy failed');
  }

  // ========== 初始化 ==========

  function init() {
    // 防止重复注入
    if (document.getElementById('cf-md-copy-btn')) return;

    // 将按钮添加到页面
    const btn = createCopyButton();
    document.body.appendChild(btn);
  }

  // 等待页面加载完成后注入
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 监听可能的页面变化（SPA 导航）
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // 重新注入按钮
      setTimeout(init, 500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();