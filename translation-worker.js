import {translateForExam} from './translation-quality.js?v=introduction-native-fix-20261124';

const runtime = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/';
const model = 'Xenova/opus-mt-en-ar';
const revision = '034a684356c19021a187cda4d7f823298b913921';
let translator;

async function load() {
 const {pipeline,env}=await import(runtime+'transformers.min.js');
 env.allowLocalModels=false;
 env.backends.onnx.wasm.wasmPaths=runtime;
 env.backends.onnx.wasm.numThreads=1;
 return pipeline('translation',model,{
  device:'wasm',dtype:'q8',revision,
  progress_callback:({status,file,loaded,total})=>{
   if(status==='progress'&&total)self.postMessage({progress:{file,loaded,total}});
  }
 });
}

self.onmessage=async ({data:{text}})=>{
 try{
  const value=await translateForExam(text,async source=>{
   translator??=load();
   const pipe=await translator;
   self.postMessage({ready:true});
   // Reject inputs that would require truncating the source.
   if(pipe.tokenizer(source).input_ids.size>300)return null;
   const [{translation_text}]=await pipe(source,{max_new_tokens:384});
   return translation_text;
  });
  self.postMessage({value});
 }catch{
  self.postMessage({error:true});
 }
};
