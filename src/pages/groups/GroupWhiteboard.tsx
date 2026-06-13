import { useParams, useOutletContext } from 'react-router-dom';

import Whiteboard from '../../components/Whiteboard';

export default function GroupWhiteboard() {
  const { groupId } = useParams<{ groupId: string }>();
  const { group } = useOutletContext<any>();

  if (!groupId) return null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-2 md:px-6 md:py-4 border-b border-slate-200/60 flex items-center justify-between shrink-0 mb-4">
        <div>
          <h2 className="text-sm md:text-xl font-bold text-slate-900 uppercase tracking-widest leading-none">Collaborative Whiteboard</h2>
        </div>
      </div>
      
      <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 overflow-hidden min-h-0">
        <Whiteboard groupId={groupId} groupName={group?.name} />
      </div>
    </div>
  );
}
