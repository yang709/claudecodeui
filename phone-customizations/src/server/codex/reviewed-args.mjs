// Apply the official approval-review preset only to sandboxed, on-request runs.
// Other explicit permission modes retain their own behavior.
export function reviewedArgs(args) {
  const index=args.indexOf('--sandbox');
  const request=args.some((arg,i)=>args[i-1]==='--config'&&arg==='approval_policy="on-request"');
  if(args[0]!=='exec'||index<0||args[index+1]!=='workspace-write'||!request)return [...args];
  const result=[...args];result.splice(index,2);
  if(!result.includes('--approve-for-me'))result.splice(1,0,'--approve-for-me');
  return result;
}
