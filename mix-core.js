(function(root){
  'use strict';
  function createMixer({options,initial,load=async()=>{},storage,onChange=()=>{}}){
    const key='moon-wardrobe:mix:v1',fields=Object.keys(options);
    const valid=look=>look&&fields.every(k=>options[k].includes(look[k]));
    let saved=[];let token=0;
    try{const data=JSON.parse(storage?.getItem(key)||'[]');if(Array.isArray(data))saved=data.filter(valid).slice(-60);}catch(_){}
    const state={look:{...initial},pending:null,error:'',history:[],saved};
    const equal=(a,b)=>fields.every(k=>a[k]===b[k]);
    function emit(){onChange(state);}
    async function change(patch){
      if(!patch||Object.keys(patch).some(k=>!fields.includes(k)))return false;
      const wanted={...(state.pending||state.look),...patch};
      if(!valid(wanted))return false;
      const current=++token;state.pending=wanted;state.error='';emit();
      try{
        await load(wanted);
        if(current!==token)return false;
        if(!equal(state.look,wanted)){state.history.push({...state.look});if(state.history.length>40)state.history.shift();}
        state.look=wanted;state.pending=null;emit();return true;
      }catch(_){if(current!==token)return false;state.pending=null;state.error='单件素材加载失败，已保留原搭配。';emit();return false;}
    }
    function undo(){token++;state.pending=null;state.error='';const previous=state.history.pop();if(previous)state.look=previous;emit();}
    function save(){
      if(state.saved.some(x=>equal(x,state.look)))return 'duplicate';
      const next=[...state.saved,{...state.look}].slice(-60);
      try{if(!storage?.setItem)throw Error('blocked');storage.setItem(key,JSON.stringify(next));state.saved=next;emit();return 'saved';}catch(_){return 'unavailable';}
    }
    function remove(index){const next=state.saved.filter((_,i)=>i!==index);try{if(!storage?.setItem)throw Error('blocked');storage.setItem(key,JSON.stringify(next));state.saved=next;emit();return true;}catch(_){return false;}}
    return {state,change,undo,save,remove};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={createMixer};else root.MoonMixer={createMixer};
})(typeof globalThis!=='undefined'?globalThis:this);
