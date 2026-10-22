import {userDb} from './modules/database/index.js';
import {getProjectsWithSessions} from './modules/projects/services/projects-with-sessions-fetch.service.js';
import {providerAuthService} from './modules/providers/services/provider-auth.service.js';
import {providerModelsService} from './modules/providers/services/provider-models.service.js';
export async function startupBootstrap(req,res,next){
  res.setHeader('Cache-Control','no-store');
  try{
    const user={id:Number(req.user.id),username:req.user.username};
    const projects=await getProjectsWithSessions({skipSynchronization:true});
    res.json({user,hasCompletedOnboarding:userDb.hasCompletedOnboarding(Number(user.id)),projects});
  }catch(error){next(error)}
}
export async function startupModels(_req,res,next){
  res.setHeader('Cache-Control','no-store');
  try{
    const entries=await Promise.all(['claude','cursor','codex','opencode'].map(async provider=>{
      try{
        const auth=await providerAuthService.getProviderAuthStatus(provider);
        if(!auth.authenticated)return[provider,{OPTIONS:[],DEFAULT:'',CONNECTED:false}];
        return[provider,{...await providerModelsService.getProviderModels(provider),CONNECTED:true}];
      }catch{return[provider,{OPTIONS:[],DEFAULT:'',CONNECTED:false}]}
    }));
    res.json({models:Object.fromEntries(entries)});
  }catch(error){next(error)}
}
