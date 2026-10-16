export function resolveProfileChildId(profile: { id: string } | { child: { id: string } }): string {
  return "child" in profile ? profile.child.id : profile.id;
}
