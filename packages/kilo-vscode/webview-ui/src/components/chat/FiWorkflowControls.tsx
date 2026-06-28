import { Accessor, Component, createSignal, onCleanup, onMount } from "solid-js"
import { Button } from "@kilocode/kilo-ui/button"
import { Card } from "@kilocode/kilo-ui/card"
import { Dialog } from "@kilocode/kilo-ui/dialog"
import { Icon } from "@kilocode/kilo-ui/icon"
import { Switch } from "@kilocode/kilo-ui/switch"
import { Tooltip } from "@kilocode/kilo-ui/tooltip"
import { useDialog } from "@kilocode/kilo-ui/context/dialog"
import SettingsRow from "../settings/SettingsRow"
import { useVSCode } from "../../context/vscode"

export type FiState = "analysis" | "default"

export const FI_DEFAULT_COMMAND = "/fi-analysis-implementation-default"

export function withFiDefault(text: string) {
  if (!text) return FI_DEFAULT_COMMAND
  if (text.startsWith(FI_DEFAULT_COMMAND)) return text
  return `${FI_DEFAULT_COMMAND}\n${text}`
}

export function createFiWorkflow() {
  const [enabled, setEnabled] = createSignal(false)
  const [state, setState] = createSignal<FiState>("default")

  const set = (next: boolean) => {
    setEnabled(next)
    if (!next) setState("default")
  }

  return { enabled, setEnabled: set, state, setState }
}

const FiSettingsDialog: Component<{
  enabled: Accessor<boolean>
  disabled: Accessor<boolean>
  onEnabledChange: (enabled: boolean) => void
}> = (props) => {
  return (
    <Dialog title="FI 配置" description="配置分析-实施工作流。" fit>
      <div class="prompt-fi-dialog">
        <Card>
          <SettingsRow title="分析-实施" description="启用后，首次发送进入分析阶段，随后可一键切换为默认实施。">
            <Switch checked={props.enabled()} disabled={props.disabled()} onChange={props.onEnabledChange} hideLabel>
              分析-实施
            </Switch>
          </SettingsRow>
        </Card>
      </div>
    </Dialog>
  )
}

export const FiWorkflowControls: Component<{
  enabled: Accessor<boolean>
  state: Accessor<FiState>
  disabled: Accessor<boolean>
  onEnabledChange: (enabled: boolean) => void
}> = (props) => {
  const dialog = useDialog()
  const vscode = useVSCode()
  let rowRef: HTMLDivElement | undefined

  onMount(() => {
    ;(vscode as any).postMessage({ type: "fiGetConfig" })
    const unsub = (vscode as any).onMessage((msg: any) => {
      if (msg.type === "fiConfig" && msg.enabled !== props.enabled()) {
        props.onEnabledChange(msg.enabled)
      }
      return false
    })
    onCleanup(unsub)

    if (rowRef) {
      const hint = rowRef.closest<HTMLElement>(".prompt-input-hint")
      if (hint) {
        hint.style.flexWrap = "wrap"
        hint.insertBefore(rowRef, hint.lastElementChild?.nextSibling ?? null)
      }
    }
    onCleanup(() => {
      if (rowRef) {
        const hint = rowRef.closest<HTMLElement>(".prompt-input-hint")
        if (hint) hint.style.flexWrap = ""
      }
    })
  })

  const change = (next: boolean) => {
    props.onEnabledChange(next)
    ;(vscode as any).postMessage({ type: "fiSetConfig", enabled: next })
  }

  const sendFiDefault = () => {
    const el = document.querySelector<HTMLTextAreaElement>(".prompt-input")
    if (!el || !el.value.trim()) return
    el.value = withFiDefault(el.value)
    el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }))
    requestAnimationFrame(() => {
      el.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true,
      }))
    })
  }

  const status = () => {
    if (!props.enabled()) return "关闭"
    return props.state() === "analysis" ? "分析" : "默认"
  }
  const tip = () => {
    if (!props.enabled()) return "分析-实施已关闭"
    return props.state() === "analysis" ? "当前为分析阶段，可使用默认实施发送" : "首次发送后进入分析阶段"
  }
  const open = () => {
    dialog.show(() => (
      <FiSettingsDialog
        enabled={props.enabled}
        disabled={props.disabled}
        onEnabledChange={change}
      />
    ))
  }

  return (
    <div
      ref={rowRef}
      class="prompt-fi-toolbar"
      style={{
        display: "flex",
        "align-items": "center",
        "flex": "0 0 100%",
        gap: "4px",
        padding: "6px 0",
        "border-top": "1px solid var(--border-weak-base, var(--vscode-panel-border))",
      }}
    >
      <div class="prompt-input-hint-selectors" style={{ display: "flex", gap: "4px", flex: "none", "align-items": "center" }}>
        <Tooltip value="FI 配置" placement="top">
          <Button variant="ghost" size="small" onClick={open} disabled={props.disabled()} aria-label="FI 配置">
            <Icon name="sliders" size="small" />
          </Button>
        </Tooltip>
        <Tooltip value={tip()} placement="top">
          <Button
            variant="ghost"
            size="small"
            onClick={() => change(!props.enabled())}
            disabled={props.disabled()}
            aria-label={props.enabled() ? "关闭分析-实施" : "开启分析-实施"}
            aria-pressed={props.enabled()}
            class={`prompt-fi-state ${props.enabled() ? "prompt-fi-state--enabled" : ""} ${
              props.state() === "analysis" ? "prompt-fi-state--analysis" : ""
            }`}
          >
            <span class="prompt-fi-state-label">分析-实施:</span>
            <span class="prompt-fi-state-value">{status()}</span>
          </Button>
        </Tooltip>
      </div>
      <div style={{ flex: 1 }} />
      <div class="prompt-input-hint-actions" style={{ display: "flex", gap: "4px", margin: 0, flex: "none" }}>
        <Tooltip value="默认实施发送 (Ctrl+Enter)" placement="top">
          <Button variant="ghost" size="small" onClick={sendFiDefault} disabled={props.disabled()} aria-label="默认实施发送">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.5 8H11M8 4.5L11.5 8L8 11.5" stroke="currentColor" stroke-width="1.5" fill="none" />
            </svg>
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
