import permissionData from '../server_side/permission/permission.json';

export function getPermissionsForGroups(groups: string[]) {
  // Returns a flat list of CASL rules for the user's groups
  const rules: any[] = [];
  Object.entries(permissionData).forEach(([subject, groupPerms]) => {
    Object.entries(groupPerms as Record<string, string[]>).forEach(([group, actions]) => {
      if (groups.includes(group)) {
        actions.forEach(action => {
          rules.push({ action, subject });
        });
      }
    });
  });
  return rules;
}
