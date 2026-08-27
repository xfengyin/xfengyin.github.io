/* ============================================================
   Codex-style terminal interaction for xfengyin.github.io
   Zero-dependency vanilla JS
   ============================================================ */
(function () {
  'use strict';

  const termBody = document.getElementById('termBody');
  if (!termBody) return;

  const prompt = '<span class="term-prompt"><span class="path">xfengyin@github</span>:~$</span>';
  const cursor = '<span class="term-cursor"></span>';

  const bootLines = [
    { html: '<span class="t-dim">Last login: ' + new Date().toLocaleString('zh-CN') + ' on ttys000</span>' },
    { html: '' },
    { html: '<span class="ascii">  ██╗  ██╗███████╗███████╗███╗   ██╗ ██████╗ ██╗   ██╗██╗███╗   ██╗\n  ╚██╗██╔╝██╔════╝██╔════╝████╗  ██║██╔════╝ ╚██╗ ██╔╝██║████╗  ██║\n   ╚███╔╝ █████╗  █████╗  ██╔██╗ ██║██║  ███╗ ╚████╔╝ ██║██╔██╗ ██║\n   ██╔██╗ ██╔══╝  ██╔══╝  ██║╚██╗██║██║   ██║  ╚██╔╝  ██║██║╚██╗██║\n  ██╔╝ ██╗██║     ██║     ██║ ╚████║╚██████╔╝   ██║   ██║██║ ╚████║\n  ╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝  ╚═══╝ ╚═════╝    ╚═╝   ╚═╝╚═╝  ╚═══╝</span>' },
    { html: '' },
    { html: '<span class="t-dim">xfengyin/codex-home · Zola + vanilla JS · GitHub Pages</span>' },
    { html: '' },
    { html: prompt + ' <span class="t-cmd">whoami</span>' },
    { html: '<span class="t-ok">xfengyin</span> — Hardware Engineer / Embedded Developer / Tech Blogger' },
    { html: prompt + ' <span class="t-cmd">cat ~/quote.txt</span>' },
    { html: '<span class="t-amber">"荣耀存于心，而非留于形。"</span>' },
    { html: '<span class="t-dim">"The glory lies in the heart, not in the form."</span>' },
    { html: '' },
    { html: '<span class="t-dim">Type <span class="t-cmd">help</span> to see available commands.</span>' }
  ];

  function makeLine(html) {
    const line = document.createElement('div');
    line.className = 'term-line';
    line.innerHTML = html;
    return line;
  }

  function makeInputLine() {
    const line = document.createElement('div');
    line.className = 'term-input-line';
    line.innerHTML = prompt + ' ';
    const input = document.createElement('input');
    input.id = 'termInput';
    input.autocomplete = 'off';
    input.autocorrect = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.placeholder = 'type "help" ...';
    line.appendChild(input);
    return { line, input };
  }

  // Boot sequence with typing effect
  function boot() {
    let i = 0;
    function renderNext() {
      if (i >= bootLines.length) {
        appendInput();
        termBody.scrollTop = termBody.scrollHeight;
        return;
      }
      const item = bootLines[i++];
      const line = makeLine(item.html);
      termBody.appendChild(line);
      termBody.scrollTop = termBody.scrollHeight;
      const delay = item.html === '' ? 60 : 180;
      setTimeout(renderNext, delay);
    }
    renderNext();
  }

  function appendInput() {
    const { line, input } = makeInputLine();
    termBody.appendChild(line);
    input.focus();
    termBody.scrollTop = termBody.scrollHeight;

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = input.value.trim();
        if (cmd) runCommand(cmd);
        input.value = '';
      }
    });
  }

  function printLine(html) {
    const line = makeLine(html);
    termBody.appendChild(line);
    termBody.scrollTop = termBody.scrollHeight;
    return line;
  }

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function runCommand(raw) {
    const cmd = raw.toLowerCase();
    printLine(prompt + ' <span class="t-cmd">' + escapeHtml(raw) + '</span>');

    if (cmd === 'help') {
      printLine('<span class="t-dim">Available commands:</span>');
      [
        ['whoami', 'print identity'],
        ['about', 'jump to about section'],
        ['posts', 'jump to posts'],
        ['projects', 'jump to projects'],
        ['skills', 'jump to skills'],
        ['github', 'open GitHub profile'],
        ['neofetch', 'print system info'],
        ['ls', 'list sections'],
        ['clear', 'clear terminal'],
        ['echo [text]', 'print text']
      ].forEach(function (c) {
        printLine('  <span class="t-cmd">' + c[0].padEnd(14) + '</span><span class="t-dim">' + c[1] + '</span>');
      });
    } else if (cmd === 'whoami') {
      printLine('<span class="t-ok">xfengyin</span>');
      printLine('Hardware Engineer / Embedded Developer / Tech Blogger');
    } else if (cmd === 'about') {
      scrollToId('about');
    } else if (cmd === 'posts' || cmd === 'blog') {
      scrollToId('posts');
    } else if (cmd === 'projects') {
      scrollToId('projects');
    } else if (cmd === 'skills') {
      scrollToId('skills');
    } else if (cmd === 'github') {
      window.open('https://github.com/xfengyin', '_blank', 'noopener');
    } else if (cmd === 'neofetch') {
      printLine('<span class="t-ok">xfengyin@github</span>');
      printLine('<span class="t-dim">-------------------</span>');
      printLine('<span class="t-purple">OS:</span> Zola (Rust static site generator)');
      printLine('<span class="t-purple">Shell:</span> bash 5.2 + vanilla JS');
      printLine('<span class="t-purple">Host:</span> GitHub Pages');
      printLine('<span class="t-purple">Editor:</span> VS Code / Vim');
      printLine('<span class="t-purple">Languages:</span> Rust, Go, Python, TypeScript, C');
      printLine('<span class="t-purple">Focus:</span> Hardware + Embedded + AI Applications');
    } else if (cmd === 'ls') {
      printLine('<span class="t-blue">about.md</span>  <span class="t-blue">posts/</span>  <span class="t-blue">projects.json</span>  <span class="t-blue">skills.py</span>');
    } else if (cmd === 'clear' || cmd === 'cls') {
      termBody.innerHTML = '';
      appendInput();
      return;
    } else if (cmd.startsWith('echo ')) {
      printLine(raw.slice(5));
    } else if (cmd === 'sudo' || cmd.startsWith('sudo ')) {
      printLine('<span class="t-red">Permission denied: nice try.</span>');
    } else if (cmd === '') {
      // no-op
    } else {
      printLine('<span class="t-red">command not found: ' + escapeHtml(raw) + '</span>');
      printLine('<span class="t-dim">Type "help" to see available commands.</span>');
    }
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Scroll reveal
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.window').forEach(function (el) {
    el.classList.add('fade-in');
    observer.observe(el);
  });

  boot();
})();
