import {createFileRoute,Link} from '@tanstack/react-router';
import {useQuery} from '@tanstack/react-query';
import {ArrowLeft} from 'lucide-react';
import {fetchRecentSessions,fetchRecentSets,fetchAllTimePRs} from '@/lib/dashboard-queries';
import {VolumeSection,PRsSection} from '../home';
export const Route=createFileRoute('/_authenticated/profile/progress')({component:ProgressPage});
function ProgressPage(){
 const {user}=Route.useRouteContext();
 const sessions=useQuery({queryKey:['dash','sessions',user.id],queryFn:()=>fetchRecentSessions(120)});
 const sets=useQuery({queryKey:['dash','sets',user.id],queryFn:()=>fetchRecentSets(120)});
 const prs=useQuery({queryKey:['dash','prs',user.id],queryFn:fetchAllTimePRs});
 return <div className="mx-auto max-w-md space-y-4 px-4 pt-[calc(env(safe-area-inset-top)+16px)]"><header className="flex items-center gap-3"><Link to="/home" aria-label="Torna alla Home" className="flex size-11 items-center justify-center rounded-full bg-fill"><ArrowLeft className="size-5"/></Link><h1 className="text-2xl font-bold">Progressi e record</h1></header><VolumeSection sessions={sessions.data} sets={sets.data} loading={sessions.isLoading||sets.isLoading}/><PRsSection prs={prs.data} sets={sets.data} loading={prs.isLoading||sets.isLoading}/></div>;
}
