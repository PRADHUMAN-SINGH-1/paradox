(function () {
  'use strict';

  function qs(root, selector) { return root.querySelector(selector); }
  function qsa(root, selector) { return Array.prototype.slice.call(root.querySelectorAll(selector)); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function status(root, text, type) {
    var box = qs(root, '#status');
    if (box) box.innerHTML = text ? '<div class="status-' + (type || 'error') + '">' + esc(text) + '</div>' : '';
  }
  function render(root, html) {
    var empty = qs(root, '#emptyPreview') || qs(root, '#empty');
    var output = qs(root, '#output');
    if (empty) empty.hidden = true;
    if (output) {
      output.hidden = false;
      output.innerHTML = '<div class="sheet utility-result">' + html + '</div>';
    }
  }

  var menu = document.getElementById('mobileNav');
  var menuButton = document.querySelector('.menu-toggle');
  if (menu && menuButton) {
    function closeMenu() {
      menu.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.textContent = '☰';
    }
    menuButton.addEventListener('click', function () {
      var open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.textContent = open ? '×' : '☰';
    });
    qsa(document, '#mobileNav a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    qsa(document, '.section, .tool-card, .quick-grid > a, .live-card, .generator-panel, .generator-preview').forEach(function (el) {
      el.dataset.reveal = '';
      observer.observe(el);
    });
  }

  qsa(document, '.ai-page[data-ai-tool]').forEach(function (root) {
    var mode = root.dataset.aiTool;
    if (mode === 'regex') {
      var fields = qs(root, '#fields');
      if (fields && !qs(fields, '#flags')) {
        fields.insertAdjacentHTML('beforeend', '<div class="field"><label>Flags</label><input id="flags" value="g" placeholder="gim"></div>');
      }
    }
    root.addEventListener('click', function (event) {
      var button = event.target.closest('#run');
      if (!button) return;
      if (mode !== 'base64' && mode !== 'regex') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      function value(id) { var node = qs(root, '#' + id); return node ? node.value : ''; }
      if (mode === 'base64') {
        var raw = value('text');
        if (!raw) return status(root, 'Enter text or Base64 first.');
        var encoded = '';
        var decoded = '';
        var decodedOk = false;
        try { decoded = decodeURIComponent(escape(atob(raw.replace(/-/g, '+').replace(/_/g, '/')))); decodedOk = true; } catch (e) {}
        try { encoded = btoa(unescape(encodeURIComponent(raw))); } catch (e) { return status(root, 'Could not encode this value.'); }
        var html = '<h2 class="result-title">Base64</h2><p><strong>Encoded</strong></p><pre class="code-block">' + esc(encoded) + '</pre>';
        if (decodedOk) html += '<p><strong>Decoded</strong></p><pre class="code-block">' + esc(decoded) + '</pre>';
        render(root, html);
      }
      if (mode === 'regex') {
        try {
          var re = new RegExp(value('pattern'), value('flags') || 'g');
          var matches = [];
          var match;
          var source = value('text');
          while ((match = re.exec(source)) !== null) {
            matches.push(match[0]);
            if (match[0] === '') re.lastIndex += 1;
          }
          render(root, '<h2 class="result-title">Matches</h2><div class="utility-big">' + matches.length + '</div><pre class="code-block">' + esc(matches.join('\n') || 'No matches') + '</pre>');
        } catch (error) {
          status(root, 'Invalid regex: ' + error.message);
        }
      }
    }, true);
  });

  qsa(document, '.utility-page[data-utility]').forEach(function (root) {
    var mode = root.dataset.utility;
    if (mode !== 'timezone' && mode !== 'countdown') return;
    root.addEventListener('click', function (event) {
      var button = event.target.closest('#calculate');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      var a = qs(root, '[data-field="a"]');
      var b = qs(root, '[data-field="b"]');
      var zoneNode = qs(root, '[data-field="zone"]');
      var aValue = a ? a.value : '';
      var bValue = b ? b.value : '';
      var targetZone = zoneNode && zoneNode.value ? zoneNode.value.trim() : 'Asia/Kolkata';
      if (mode === 'countdown') {
        var target = new Date(aValue);
        if (isNaN(target.getTime())) return status(root, 'Choose a valid target date and time.');
        clearInterval(root._paradoxTimer);
        function paintCountdown() {
          var diff = target.getTime() - Date.now();
          var abs = Math.abs(diff);
          var days = Math.floor(abs / 86400000);
          var hours = Math.floor(abs % 86400000 / 3600000);
          var mins = Math.floor(abs % 3600000 / 60000);
          var secs = Math.floor(abs % 60000 / 1000);
          render(root, '<h2 class="result-title">' + (diff >= 0 ? 'Time remaining' : 'Time elapsed') + '</h2><div class="utility-big">' + days + 'd ' + hours + 'h ' + mins + 'm ' + secs + 's</div><p>' + esc(target.toLocaleString()) + '</p>');
        }
        paintCountdown();
        root._paradoxTimer = setInterval(paintCountdown, 1000);
        return;
      }
      var parts = aValue.split('T');
      if (!parts[0] || !parts[1]) return status(root, 'Choose a valid date and time.');
      var dateParts = parts[0].split('-').map(Number);
      var timeParts = parts[1].split(':').map(Number);
      var year = dateParts[0], month = dateParts[1], day = dateParts[2], hour = timeParts[0], minute = timeParts[1];
      var sourceZone = (bValue || 'UTC').trim();
      var guess = Date.UTC(year, month - 1, day, hour, minute);
      try {
        for (var i = 0; i < 3; i += 1) {
          var partsOut = new Intl.DateTimeFormat('en-US', { timeZone: sourceZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(guess));
          var map = {};
          partsOut.forEach(function (part) { map[part.type] = part.value; });
          var asUtc = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(map.hour) % 24, Number(map.minute));
          guess += Date.UTC(year, month - 1, day, hour, minute) - asUtc;
        }
        var formatted = new Intl.DateTimeFormat(undefined, { timeZone: targetZone, dateStyle: 'full', timeStyle: 'long' }).format(new Date(guess));
        render(root, '<h2 class="result-title">' + esc(targetZone) + '</h2><div class="utility-big utility-time">' + esc(formatted) + '</div><p>' + esc(sourceZone) + ' → ' + esc(targetZone) + '</p>');
      } catch (error) {
        status(root, 'Use a valid IANA timezone such as Europe/London or Asia/Kolkata.');
      }
    }, true);
  });

  qsa(document, '.generator-page[data-mode]').forEach(function (root) {
    var mode = root.dataset.mode;
    if (mode !== 'wheel' && mode !== 'raffle') return;
    root.addEventListener('click', function (event) {
      var generate = event.target.closest('#generate');
      if (!generate) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      var input = qs(root, '#items');
      var items = input ? input.value.split(/[\n,]+/).map(function (x) { return x.trim(); }).filter(Boolean) : [];
      if (mode === 'wheel') {
        if (items.length < 2) return status(root, 'Add at least 2 choices.');
        render(root, '<h2 class="result-title">Decision wheel</h2><div class="wheel-wrap"><div class="wheel-pointer">▼</div><div class="wheel-visual" id="experienceWheel"></div><button class="gen-btn" type="button" id="experienceSpin">SPIN</button><p id="experienceWheelStatus">' + items.length + ' choices ready.</p></div>');
        var spin = qs(root, '#experienceSpin');
        var visual = qs(root, '#experienceWheel');
        if (visual) {
          var segment = 360 / items.length;
          var colors = items.map(function (_, i) { return i % 2 ? '#f2f0e9' : '#ffcf55'; });
          var gradient = colors.map(function (color, i) { return color + ' ' + (i * segment) + 'deg ' + ((i + 1) * segment) + 'deg'; }).join(',');
          visual.style.background = 'conic-gradient(' + gradient + ')';
        }
        if (spin) spin.addEventListener('click', function () {
          var index = Math.floor(Math.random() * items.length);
          var angle = 1800 + (360 - ((index + 0.5) * 360 / items.length));
          if (visual) visual.style.transform = 'rotate(' + angle + 'deg)';
          window.setTimeout(function () { var result = qs(root, '#experienceWheelStatus'); if (result) result.textContent = 'Winner: ' + items[index]; }, 2900);
        });
      } else {
        var qtyNode = qs(root, '#qty');
        var titleNode = qs(root, '#ticketTitle');
        var qty = Math.max(4, Math.min(200, Number(qtyNode ? qtyNode.value : 24) || 24));
        var title = (titleNode ? titleNode.value : 'Raffle').trim() || 'Raffle';
        root._paradoxTickets = [];
        for (var n = 1; n <= qty; n += 1) root._paradoxTickets.push(n);
        var tickets = '';
        for (var t = 1; t <= qty; t += 1) tickets += '<div class="ticket"><strong>TICKET #' + String(t).padStart(3, '0') + '</strong><p>' + esc(title) + '</p></div>';
        render(root, '<h2 class="result-title">' + esc(title) + '</h2><div class="print-grid">' + tickets + '</div><div class="generator-actions"><button class="gen-btn" type="button" id="experienceDraw">DRAW WINNER</button><button class="gen-btn alt" type="button" id="experienceReset">RESET</button></div><p id="experienceWinner">' + qty + ' tickets available.</p>');
        var draw = qs(root, '#experienceDraw');
        var reset = qs(root, '#experienceReset');
        if (draw) draw.addEventListener('click', function () {
          if (!root._paradoxTickets.length) { qs(root, '#experienceWinner').textContent = 'No tickets left. Reset the draw.'; return; }
          var idx = Math.floor(Math.random() * root._paradoxTickets.length);
          var winner = root._paradoxTickets.splice(idx, 1)[0];
          qs(root, '#experienceWinner').textContent = 'Winner: ticket #' + String(winner).padStart(3, '0') + ' · ' + root._paradoxTickets.length + ' left.';
        });
        if (reset) reset.addEventListener('click', function () {
          root._paradoxTickets = [];
          for (var r = 1; r <= qty; r += 1) root._paradoxTickets.push(r);
          qs(root, '#experienceWinner').textContent = qty + ' tickets available.';
        });
      }
    }, true);
  });
})();
