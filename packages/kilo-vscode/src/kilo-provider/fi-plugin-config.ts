import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"

const CONFIG_FILE = path.join(os.homedir(), ".opencode-fi-plugin-config", "opencode-fi-plugin.jsonc")
const STATUS_DIR = path.join(os.homedir(), ".opencode-fi-plugin-config", "status")

function stripJsonComments(text: string): string {
  let result = ""
  let inString = false
  for (let i = 0; i < text.length; i++) {
    if (inString) {
      if (text[i] === '"' && (i === 0 || text[i - 1] !== "\\")) inString = false
      result += text[i]; continue
    }
    if (text[i] === '"') { inString = true; result += text[i]; continue }
    if (text[i] === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; result += "\n"; continue }
    if (text[i] === "/" && text[i + 1] === "*") { i += 2; while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++; i++; continue }
    result += text[i]
  }
  return result
}

async function readAnalysisEnabled(): Promise<{ enabled: boolean }> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf-8")
    const cfg = JSON.parse(stripJsonComments(raw)) as {
      workflows?: { "analysis-implementation"?: boolean | { enabled?: boolean } }
    }
    const wf = cfg.workflows?.["analysis-implementation"]
    return { enabled: typeof wf === "boolean" ? wf : (wf?.enabled ?? false) }
  } catch {
    return { enabled: false }
  }
}

async function writeAnalysisEnabled(enabled: boolean): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true })
  await fs.writeFile(CONFIG_FILE, JSON.stringify({ workflows: { "analysis-implementation": { enabled } } }, null, 2), "utf-8")
}

function readSessionStatus(sessionID: string): Record<string, unknown> {
  try {
    const filePath = path.join(STATUS_DIR, `${sessionID}.json`)
    return JSON.parse(readFileSync(filePath, "utf-8"))
  } catch {
    return {}
  }
}

export async function handleFiMessage(
  message: { type: string; enabled?: boolean; sessionID?: string },
  ctx: { post: (msg: unknown) => void },
): Promise<boolean> {
  if (message.type === "fiGetConfig") {
    const { enabled } = await readAnalysisEnabled()
    const status = message.sessionID ? readSessionStatus(message.sessionID) : {}
    ctx.post({ type: "fiConfig", enabled, sessionID: message.sessionID, status })
    return true
  }
  if (message.type === "fiSetConfig" && typeof message.enabled === "boolean") {
    await writeAnalysisEnabled(message.enabled)
    ctx.post({ type: "fiConfig", enabled: message.enabled })
    return true
  }
  return false
}
