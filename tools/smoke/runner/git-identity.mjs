const SMOKE_GIT_IDENTITY = Object.freeze([
  '-c',
  'user.name=Smoke Test',
  '-c',
  'user.email=smoke@example.test',
]);

export function withSmokeGitIdentity(args) {
  return [...SMOKE_GIT_IDENTITY, ...args];
}
