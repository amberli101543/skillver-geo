export type ProcessRole = "api" | "worker" | "all";

export function processRole(): ProcessRole {
  const role = process.env.PROCESS_ROLE?.trim();
  if (role === "api" || role === "worker") {
    return role;
  }
  return "all";
}

export function isApiProcess(): boolean {
  const role = processRole();
  return role === "api" || role === "all";
}

export function isWorkerProcess(): boolean {
  const role = processRole();
  return role === "worker" || role === "all";
}
