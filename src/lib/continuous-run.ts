export const CONTINUOUS_RUN = "Corsa continua";
export function parseRunDuration(value: string): number | null {
  const parts=value.trim().split(":");
  if(parts.length<2 || parts.length>3 || parts.some(p=>!/^\d{1,3}$/.test(p)))return null;
  const numbers=parts.map(Number);
  if(numbers.slice(1).some(n=>n>=60))return null;
  const seconds=numbers.reduce((n,p)=>n*60+p,0);
  return seconds>0?seconds:null;
}
export function runPace(distanceM:number,seconds:number):string {
  if(!(distanceM>0&&seconds>0))return "—";
  const pace=Math.round(seconds/(distanceM/1000));
  return `${Math.floor(pace/60)}:${String(pace%60).padStart(2,"0")}/km`;
}
