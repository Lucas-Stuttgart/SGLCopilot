// Loaded only after explicit model activation. Inference stays off the UI thread.
import {pipeline,env} from './assets/runtime/transformers.min.js';
env.allowLocalModels=false;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.wasmPaths=new URL('./assets/runtime/',import.meta.url).href;
let generator;
self.onmessage=async({data})=>{
  try{
    if(data.type==='load'){
      generator=await pipeline('text-generation','onnx-community/Qwen2.5-0.5B-Instruct',{
        device:'wasm',dtype:'int8',revision:'22942cb7d7ba4cc81bb4673549ca4d4614469b5e', progress_callback:p=>{
          if(p.status==='progress'&&p.file.endsWith('.onnx'))postMessage({type:'progress',value:p.progress});
        }
      });
      postMessage({type:'ready'});return;
    }
    if(!generator)throw new Error('Bitte zuerst das Sprachmodell laden.');
    const out=await generator(data.messages,{max_new_tokens:data.tokens,do_sample:false,return_full_text:false});
    const value=out[0].generated_text;
    postMessage({type:'result',text:typeof value==='string'?value:value.at(-1).content});
  }catch(e){postMessage({type:'failure',message:e.message||String(e)})}
};
