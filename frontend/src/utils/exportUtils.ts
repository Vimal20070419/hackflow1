import { ITeam } from '../types/index.js';

/**
 * Generates and downloads a clean CSV file of teams directly in the browser
 */
export const downloadTeamsCSV = (teams: ITeam[], filterLabel: string = 'All_Teams') => {
  if (!teams || teams.length === 0) {
    alert('No team data available to export.');
    return;
  }

  const headers = [
    'S.No',
    'Registration ID',
    'Team Name',
    'College Name',
    'Domain',
    'Status',
    'Barcode Wristband ID',
    'Team Leader Name',
    'Leader Phone',
    'Leader Email',
    'Total Members',
    'Member 1',
    'Member 2',
    'Member 3',
    'Member 4',
    'Allocated Desk',
    'Check-in Timestamp',
  ];

  const rows = teams.map((team, index) => {
    const leader = team.teamLeader || team.members?.find((m) => m.isLeader) || team.members?.[0];
    const members = team.members || [];

    const member1 = members[0] ? `${members[0].name} (${members[0].phone || 'No phone'})` : '';
    const member2 = members[1] ? `${members[1].name} (${members[1].phone || 'No phone'})` : '';
    const member3 = members[2] ? `${members[2].name} (${members[2].phone || 'No phone'})` : '';
    const member4 = members[3] ? `${members[3].name} (${members[3].phone || 'No phone'})` : '';

    const checkInTime = team.allocatedAt
      ? new Date(team.allocatedAt).toLocaleString()
      : team.registrationStatus === 'CONFIRMED'
      ? 'Checked In'
      : 'Pending';

    return [
      index + 1,
      `"${team.registrationId || team._id || ''}"`,
      `"${(team.teamName || team.name || '').replace(/"/g, '""')}"`,
      `"${(team.collegeName || '').replace(/"/g, '""')}"`,
      `"${(team.domain || 'General').replace(/"/g, '""')}"`,
      team.registrationStatus || 'PENDING',
      team.qrId || 'Not Assigned',
      `"${(leader?.name || '').replace(/"/g, '""')}"`,
      `"${leader?.phone || ''}"`,
      `"${leader?.email || ''}"`,
      members.length,
      `"${member1.replace(/"/g, '""')}"`,
      `"${member2.replace(/"/g, '""')}"`,
      `"${member3.replace(/"/g, '""')}"`,
      `"${member4.replace(/"/g, '""')}"`,
      team.allocatedDesk ? `Desk ${team.allocatedDesk}` : 'Unassigned',
      `"${checkInTime}"`,
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\r\n');

  // Trigger browser download with BOM for Excel UTF-8 support
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `Hackathon_${filterLabel}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
