export function createBrowserDictation({ Recognition, onText, onError, onState, language }) {
  let current = null;
  return {
    start() {
      if (current) return;
      if (!Recognition) { onError('Voice input is unavailable in this browser. Use your phone keyboard microphone.'); return; }
      const speech = new Recognition();
      const run = { speech, text: '', send: false, cancelled: false, failed: false };
      current = run;
      speech.lang = language || 'zh-CN';
      speech.continuous = false;
      speech.interimResults = true;
      speech.onresult = event => {
        if (current !== run) return;
        run.text = Array.from(event.results, result => result[0]?.transcript || '').join(' ').trim();
      };
      speech.onerror = event => {
        if (current !== run || run.cancelled) return;
        run.failed = true;
        const messages = {
          'not-allowed': 'Microphone access denied. Allow microphone access in browser settings.',
          'service-not-allowed': 'Browser speech recognition is not allowed. Use keyboard dictation or configure a voice backend.',
          'audio-capture': 'No microphone is available.',
          'no-speech': 'No speech detected. Tap the microphone and try again.',
          'network': 'Browser speech service is unreachable. Try keyboard dictation or configure a voice backend.',
          'language-not-supported': 'This speech language is not supported by your browser.',
        };
        onError(messages[event.error] || 'Speech recognition failed. Please try again.');
        current = null; onState('idle');
      };
      speech.onend = () => {
        if (current !== run) return;
        current = null; onState('idle');
        if (!run.cancelled && !run.failed) {
          if (run.text) onText(run.text, run.send);
          else onError('No speech detected. Tap the microphone and try again.');
        }
      };
      try { onState('recording'); speech.start(); }
      catch { current = null; onState('idle'); onError('Unable to start speech recognition. Please try again.'); }
    },
    stop(options = {}) {
      if (!current) return;
      current.send = options.send === true;
      onState('transcribing');
      try { current.speech.stop(); } catch { this.cancel(); }
    },
    cancel() {
      const run = current; if (!run) return;
      run.cancelled = true; current = null;
      try { run.speech.abort(); } catch {}
      onState('idle');
    },
    get active() { return current !== null; },
  };
}
