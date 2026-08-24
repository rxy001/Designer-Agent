import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { clientMessageSchema, validateSiteDocument, type ServerMessage } from "@designer-agent/site-contract";
import type { WebSocket, WebSocketServer } from "ws";
import { SiteRunCoordinator } from "./siteRunCoordinator.ts";
import { siteAuditLogger } from "../logging/siteAuditLogger.ts";

export function installSiteProtocol(server: WebSocketServer, coordinator: SiteRunCoordinator) {
  server.on("connection", (socket) => {
    const connectionId = randomUUID();
    const connectionIdHash = createHash("sha256").update(connectionId).digest("hex").slice(0, 16);
    siteAuditLogger.record("site.protocol.connected", { connectionIdHash });
    const emit = (message: ServerMessage) => send(socket, message);
    const planningControllers = new Map<string, AbortController>();
    socket.on("message", async (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        siteAuditLogger.record("site.protocol.invalid_json", { connectionIdHash }, { level: "warn" });
        emit({ type: "error", code: "invalid_json", message: "Invalid WebSocket message JSON." });
        return;
      }
      const result = clientMessageSchema.safeParse(parsed);
      if (!result.success) {
        const requestId = typeof parsed === "object" && parsed && "requestId" in parsed && typeof parsed.requestId === "string" ? parsed.requestId : undefined;
        siteAuditLogger.record("site.protocol.invalid_message", { connectionIdHash, requestId, issues: result.error.issues.map((issue) => issue.code) }, { level: "warn" });
        emit({ type: "error", requestId, code: "invalid_message", message: result.error.message });
        return;
      }
      const message = result.data;
      try {
        switch (message.type) {
          case "ai.site.plan.request": {
            const site = validateSiteDocument(message.site);
            const controller = new AbortController();
            planningControllers.set(message.requestId, controller);
            try {
              const plan = await coordinator.requestPlan({ requestId: message.requestId, connectionId, prompt: message.prompt, designSystemId: message.designSystemId, site, target: message.target, signal: controller.signal });
              if (!controller.signal.aborted) emit({ type: "ai.site.plan.proposed", requestId: message.requestId, plan });
            } catch (error) {
              if (!controller.signal.aborted) throw error;
            } finally {
              if (planningControllers.get(message.requestId) === controller) planningControllers.delete(message.requestId);
            }
            break;
          }
          case "ai.site.plan.cancel":
            planningControllers.get(message.requestId)?.abort(new Error("Cancelled by user."));
            coordinator.cancelPlanRequest(message.requestId, connectionId);
            emit({ type: "ai.site.plan.cancelled", requestId: message.requestId });
            break;
          case "ai.site.plan.approve":
            await coordinator.approvePlan({ ...message, connectionId, emit });
            break;
          case "ai.site.plan.reject":
            coordinator.rejectPlan(message.planId);
            break;
          case "ai.site.reduced-plan.approve":
            await coordinator.approveReducedPlan({ ...message, connectionId, emit });
            break;
          case "ai.site.reduced-plan.reject":
            await coordinator.rejectReducedPlan(message.batchId, connectionId, emit);
            break;
          case "site.patch.ready":
            await coordinator.clientReady({ ...message, connectionId, emit });
            break;
          case "site.patch.reject":
            await coordinator.abort(message.batchId, connectionId, message.reason, emit);
            break;
          case "ai.site.cancel":
            await coordinator.abort(message.batchId, connectionId, "Cancelled by user.", emit);
            break;
          case "site.lock.heartbeat":
            await coordinator.heartbeat(message.siteId, message.batchId, message.leaseId);
            break;
          case "site.batch.resume":
            await coordinator.resume(message.siteId, message.batchId, connectionId, emit);
            break;
        }
      } catch (error) {
        siteAuditLogger.record("site.protocol.error", {
          connectionIdHash,
          messageType: message.type,
          error,
        }, { level: "error", context: coordinator.auditContextFor({
          batchId: "batchId" in message ? message.batchId : undefined,
          planId: "planId" in message ? message.planId : undefined,
        }) ?? messageContext(message) });
        emit({
          type: "error",
          requestId: "requestId" in message ? message.requestId : undefined,
          code: errorCode(error),
          message: error instanceof Error ? error.message : "Unknown site protocol error.",
        });
      }
    });
    socket.on("close", () => {
      for (const controller of planningControllers.values()) controller.abort(new Error("Connection closed."));
      planningControllers.clear();
      siteAuditLogger.record("site.protocol.disconnected", { connectionIdHash }, { level: "warn" });
      void coordinator.disconnect(connectionId);
    });
  });
}

function messageContext(message: import("@designer-agent/site-contract").ClientMessage) {
  if (message.type === "ai.site.plan.request") return { siteId: message.site.id, requestId: message.requestId };
  if ("siteId" in message) return { siteId: message.siteId, batchId: "batchId" in message ? message.batchId : undefined };
  return {
    batchId: "batchId" in message ? message.batchId : undefined,
    requestId: "requestId" in message ? message.requestId : undefined,
  };
}

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function errorCode(error: unknown) {
  if (!(error instanceof Error)) return "site_protocol_error";
  const candidate = error.message.split(":", 1)[0];
  return /^[a-z][a-z0-9_]+$/.test(candidate) ? candidate : "site_protocol_error";
}
