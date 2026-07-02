import type { CurrentUser, Incident } from './types';

export function canSelfAssign(_currentUser: CurrentUser, _incident: Incident, isTargetGroupMember: boolean): boolean {
  return isTargetGroupMember;
}

export function canUpdateStatus(currentUser: CurrentUser, incident: Incident, isTargetGroupMember: boolean): boolean {
  return incident.assigneeId === currentUser.userId || isTargetGroupMember;
}

export function canEditFields(currentUser: CurrentUser, incident: Incident, isTargetGroupMember: boolean): boolean {
  return incident.reporterId === currentUser.userId || isTargetGroupMember;
}

export function canComment(currentUser: CurrentUser, incident: Incident, isTargetGroupMember: boolean): boolean {
  return incident.reporterId === currentUser.userId || incident.assigneeId === currentUser.userId || isTargetGroupMember;
}
