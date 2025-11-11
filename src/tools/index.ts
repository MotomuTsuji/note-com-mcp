import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchTools } from "./search-tools.js";
import { registerNoteTools } from "./note-tools.js";
import { registerUserTools } from "./user-tools.js";
import { registerMembershipTools } from "./membership-tools.js";
import { registerMagazineTools } from "./magazine-tools.js";

/**
 * すべてのツールをMCPサーバーに登録する
 * @param server MCPサーバーインスタンス
 */
export function registerAllTools(server: McpServer): void {
  // 各カテゴリのツールを登録
  registerSearchTools(server);
  registerNoteTools(server);
  registerUserTools(server);
  registerMembershipTools(server);
  registerMagazineTools(server);
}