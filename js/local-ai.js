// Offline models: a small language model that grades flashcard answers when the Claude judge cannot be reached, and a
// Whisper model that transcribes dictation when the browser's own speech recognition cannot be used (no connection, or a
// browser without it). Both run in the browser with transformers.js 4.3.2 (Apache-2.0), downloaded with the first model rather than kept in
// this repository (GitHub's secret scanner mistakes a string in the minified file for an API key).
//
// Nothing is downloaded until the owner presses a button in Settings. A download fetches the library and the ONNX
// runtime from cdn.jsdelivr.net and the model files from huggingface.co, once. The library is checked against a SHA-256
// hash before it runs and is kept in Cache Storage ("sdq-localai"); transformers.js keeps them in the browser's Cache
// Storage ("transformers-cache"), so they then load with no connection. What has been downloaded on this device is
// recorded in localStorage['sdq.localai'], never in the progress file.
(function (SD) {
  'use strict';
  var KEY = 'sdq.localai', LIB_CACHE = 'sdq-localai';
  var LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js';
  var LIB_SHA256 = 'i1oxcfiHa6srGCCn1l64dijj0wu16oW53TmOdus03ss=';   // base64 SHA-256 of that file, as published on npm
  // Model choices. The judge uses WebGPU where the browser has it: a 1.7B model on a desktop-class device, the smallest
  // (0.6B) on a phone. Without WebGPU it runs on the CPU (WebAssembly) with the 0.6B model, which is slow but works.
  // Sizes are the files' sizes on huggingface.co on 2026-11-14, rounded.
  var JUDGE = {
    big: { id: 'onnx-community/Qwen3-1.7B-ONNX', name: 'Qwen3 1.7B', dtype: 'q4f16', device: 'webgpu', mb: 1430 },
    small: { id: 'onnx-community/Qwen3-0.6B-ONNX', name: 'Qwen3 0.6B', dtype: 'q4f16', device: 'webgpu', mb: 570 },
    cpu: { id: 'onnx-community/Qwen3-0.6B-ONNX', name: 'Qwen3 0.6B', dtype: 'q8', device: 'wasm', mb: 620 }
  };
  // Whisper base (English) at 8-bit, on the CPU: about 77 MB, and fast enough for spoken answers of a minute or two.
  var ASR = { id: 'onnx-community/whisper-base.en', name: 'Whisper base (English)', dtype: 'q8', device: 'wasm', mb: 80 };

  function read() { try { var v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* storage may be unavailable */ } }

  var lib = null, pipes = {}, loading = {}, gpu = null;
  // Loads the library from the cache, or downloads it once; refuses to run a file whose hash does not match.
  function loadLib() {
    if (lib) return lib;
    lib = caches.open(LIB_CACHE).then(function (c) {
      return c.match(LIB).then(function (r) {
        if (r) return r.arrayBuffer();
        return fetch(LIB).then(function (res) {
          if (!res.ok) throw new Error('could not download the model library (HTTP ' + res.status + ')');
          return res.arrayBuffer();
        }).then(function (buf) {
          return check(buf).then(function () { return c.put(LIB, new Response(buf, { headers: { 'content-type': 'text/javascript' } })); }).then(function () { return buf; });
        });
      });
    }).then(function (buf) {
      return check(buf).then(function () { return import(URL.createObjectURL(new Blob([buf], { type: 'text/javascript' }))); });
    }).then(function (m) {
      m.env.allowLocalModels = false;   // models come from huggingface.co (then the cache), never from this site
      return m;
    }, function (e) { lib = null; throw e; });
    return lib;
  }
  function check(buf) {
    return crypto.subtle.digest('SHA-256', buf).then(function (d) {
      var b = String.fromCharCode.apply(null, new Uint8Array(d));
      if (btoa(b) !== LIB_SHA256) throw new Error('the downloaded model library does not match its expected hash; not running it');
    });
  }
  // Resolves to true when the browser can give us a WebGPU adapter.
  function hasWebGPU() {
    if (gpu) return gpu;
    // A software ("fallback") adapter is too slow for a language model, so it counts as no WebGPU.
    gpu = !navigator.gpu ? Promise.resolve(false) : navigator.gpu.requestAdapter().then(function (a) {
      return !!a && !a.isFallbackAdapter && !(a.info && a.info.isFallbackAdapter);
    }, function () { return false; });
    return gpu;
  }
  function isPhone() {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') return navigator.userAgentData.mobile;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  }
  // The judge model this device would download: resolves to one of JUDGE's entries.
  function judgePlan() { return hasWebGPU().then(function (g) { return !g ? JUDGE.cpu : isPhone() ? JUDGE.small : JUDGE.big; }); }

  // Creates (or returns) the pipeline for 'judge' or 'asr'. onProgress gets a number 0..1 while files download.
  function pipe(kind, spec, onProgress) {
    if (pipes[kind]) return Promise.resolve(pipes[kind]);
    if (loading[kind]) return loading[kind];
    var files = {};
    loading[kind] = loadLib().then(function (m) {
      return m.pipeline(kind === 'judge' ? 'text-generation' : 'automatic-speech-recognition', spec.id, {
        dtype: spec.dtype, device: spec.device,
        progress_callback: function (p) {
          if (!onProgress || p.status !== 'progress' || !p.total) return;
          files[p.file] = [p.loaded, p.total];
          var a = 0, b = 0, f;
          for (f in files) { a += files[f][0]; b += files[f][1]; }
          onProgress(b ? a / b : 0);
        }
      });
    }).then(function (p) { pipes[kind] = p; loading[kind] = null; return p; }, function (e) { loading[kind] = null; throw e; });
    return loading[kind];
  }

  // Downloads a model and records it. kind: 'judge' or 'asr'. Resolves to the spec that was downloaded.
  function download(kind, onProgress) {
    var plan = kind === 'judge' ? judgePlan() : Promise.resolve(ASR);
    return plan.then(function (spec) {
      // If the 1.7B model cannot be loaded (not enough memory for its 1.4 GB file, say), fall back to the 0.6B one.
      var load = pipe(kind, spec, onProgress).then(null, function (e) {
        if (spec !== JUDGE.big) throw e;
        spec = JUDGE.small;
        return purge(JUDGE.big.id).then(function () { return pipe(kind, spec, onProgress); });
      });
      return load.then(function () {
        var s = read(); s[kind] = { id: spec.id, name: spec.name, dtype: spec.dtype, device: spec.device, mb: spec.mb, at: new Date().toISOString().slice(0, 10) }; write(s);
        // Ask the browser not to evict the cached models under storage pressure (it may still say no).
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
        return spec;
      });
    });
  }
  // Deletes a downloaded model's files from the cache and forgets it.
  function remove(kind) {
    var s = read(), d = s[kind];
    delete s[kind]; write(s); pipes[kind] = null;
    if (!d) return Promise.resolve();
    var other = s[kind === 'judge' ? 'asr' : 'judge'];
    if (other && other.id === d.id) return Promise.resolve();
    return purge(d.id);
  }
  // Deletes every cached file of one model.
  function purge(id) {
    if (!window.caches) return Promise.resolve();
    return caches.open('transformers-cache').then(function (c) {
      return c.keys().then(function (ks) { return Promise.all(ks.filter(function (r) { return r.url.indexOf('/' + id + '/') >= 0; }).map(function (r) { return c.delete(r); })); });
    }).catch(function () {});
  }

  /* ---------- grading ---------- */
  var SYSTEM = 'You grade a candidate\'s answer to a machine-learning interview flashcard against a reference answer. ' +
    'Judge substance, not wording. "correct": the core idea and most key points are right and nothing is wrong. "partial": the core idea is there but important points are missing or one thing is wrong. "incorrect": the core idea is missing or wrong. ' +
    'Reply with JSON only, no other text, in exactly this form: {"verdict": "correct" | "partial" | "incorrect", "covered": [short phrases], "missing": [short phrases], "wrong": [short phrases], "feedback": "one sentence"}';
  function parse(text) {
    var t = String(text || '').replace(/<think>[\s\S]*?<\/think>/g, ''), out = null, i = t.indexOf('{'), j = t.lastIndexOf('}');
    if (i >= 0 && j > i) try { out = JSON.parse(t.slice(i, j + 1)); } catch (e) { out = null; }
    if (!out || typeof out !== 'object') {
      var m = t.match(/\b(correct|partial|incorrect)\b/i);   // a reply that is not valid JSON may still name the verdict
      if (!m) throw new Error('The offline model returned no verdict. Grade this card by hand.');
      out = { verdict: m[1].toLowerCase(), feedback: '' };
    }
    out.verdict = String(out.verdict || '').toLowerCase();
    if (['correct', 'partial', 'incorrect'].indexOf(out.verdict) < 0) throw new Error('The offline model returned no verdict. Grade this card by hand.');
    ['covered', 'missing', 'wrong'].forEach(function (k) { out[k] = Array.isArray(out[k]) ? out[k].filter(function (x) { return typeof x === 'string' && x; }).slice(0, 5) : []; });
    out.feedback = typeof out.feedback === 'string' ? out.feedback : '';
    delete out.probe;   // the small model is not asked about the probe
    return out;
  }
  function grade(card, answer) {
    var d = read().judge;
    if (!d) return Promise.reject(new Error('The offline judge has not been downloaded on this device (Settings).'));
    return pipe('judge', d).then(function (p) {
      var user = 'Question:\n' + card.q + '\n\nReference answer:\n' + card.a + '\n\nCandidate answer (may be a rough voice transcript; ignore filler words):\n' + answer;
      return p([{ role: 'system', content: SYSTEM }, { role: 'user', content: user }], {
        max_new_tokens: 320, do_sample: false, tokenizer_encode_kwargs: { enable_thinking: false }
      });
    }).then(function (res) {
      var msgs = res && res[0] && res[0].generated_text, last = Array.isArray(msgs) ? msgs[msgs.length - 1] : null;
      var out = parse(last && last.content != null ? last.content : msgs);
      out.by = d.name;
      return out;
    });
  }

  /* ---------- transcription ---------- */
  // Turns a recorded audio Blob into 16 kHz mono samples, which is what Whisper expects.
  function toSamples(blob) {
    return blob.arrayBuffer().then(function (buf) {
      var AC = window.AudioContext || window.webkitAudioContext, ctx = new AC();
      return new Promise(function (ok, bad) { ctx.decodeAudioData(buf, ok, bad); }).then(function (audio) {
        ctx.close && ctx.close();
        var off = new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * 16000)), 16000), src = off.createBufferSource();
        src.buffer = audio; src.connect(off.destination); src.start();
        return off.startRendering();
      }).then(function (r) { return r.getChannelData(0); });
    });
  }
  function transcribe(blob) {
    var d = read().asr;
    if (!d) return Promise.reject(new Error('Offline dictation has not been downloaded on this device (Settings).'));
    return Promise.all([pipe('asr', d), toSamples(blob)]).then(function (x) {
      return x[0](x[1], { chunk_length_s: 30, stride_length_s: 5 });
    }).then(function (r) { return String((r && r.text) || '').trim(); });
  }

  SD.localAI = {
    JUDGE: JUDGE, ASR: ASR,
    ready: function (kind) { return !!read()[kind]; },
    info: function (kind) { return read()[kind] || null; },
    judgePlan: judgePlan, hasWebGPU: hasWebGPU,
    download: download, remove: remove,
    grade: grade, transcribe: transcribe,
    _parse: parse
  };
})(window.SD);
