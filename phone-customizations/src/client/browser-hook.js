function cloudcliUseBrowserVoice(onText,onError) {
  const [state,setState]=f.useState('idle'), callbacks=f.useRef({onText,onError}), engine=f.useRef(null);
  callbacks.current={onText,onError};
  const enabled=bc().voiceEnabled;
  f.useEffect(()=>{if(!enabled)engine.current?.cancel()},[enabled]);
  f.useEffect(()=>()=>{engine.current?.cancel()},[]);
  const toggle=f.useCallback(()=>{
    if(!engine.current)engine.current=createBrowserDictation({
      Recognition:window.SpeechRecognition||window.webkitSpeechRecognition,
      language:navigator.language||'zh-CN',
      onText:(text,send)=>callbacks.current.onText(text,send),
      onError:error=>callbacks.current.onError?.(error),onState:setState
    });
    engine.current.active?engine.current.stop():engine.current.start();
  },[]);
  const stop=f.useCallback(options=>engine.current?.stop(options),[]);
  return {state,toggle,stop};
}
function pWe(onText,onError){
  const backend=pWeBackend(onText,onError),browser=cloudcliUseBrowserVoice(onText,onError),configured=Az();
  return configured?backend:browser;
}
