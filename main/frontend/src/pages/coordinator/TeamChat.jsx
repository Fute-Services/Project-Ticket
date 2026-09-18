import { useMemo } from 'react';
import CoordinatorLayout from '../../components/coordinator/CoordinatorLayout';
import TeamChatDrawer from '../../components/TeamChatDrawer';
import { useTaskProject } from '../../context/TaskProjectContext';

export default function CoordinatorTeamChat() {
  const { projects } = useTaskProject();
  const projectChannels = useMemo(
    () => projects.map((p) => ({ id: `project-${p.id}`, name: p.name, desc: `${(p.memberIds || []).length} members + coordinator` })),
    [projects]
  );

  return (
    <CoordinatorLayout>
      <TeamChatDrawer isFullPage projectChannels={projectChannels} />
    </CoordinatorLayout>
  );
}
