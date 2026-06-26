import { Accessor, onCleanup, onMount, Show } from "solid-js"
import { Button } from "@kilocode/kilo-ui/button"
import { Icon } from "@kilocode/kilo-ui/icon"
import { Tooltip } from "@kilocode/kilo-ui/tooltip"
import { createFiWorkflow, FiWorkflowControls, withFiDefault } from "./FiWorkflowControls"

interface UseFiWorkflowOptions {
  getText: Accessor<string>
  setText: (text: string) => void
  hasInput: Accessor<boolean>
  isBusy: Accessor<boolean>
  canSend: Accessor<boolean>
}

export function useFiWorkflow(opts: UseFiWorkflowOptions) {
  const fi = createFiWorkflow()
  let doSend: (() => Promise<void>) | undefined

  const canSendFiDefault = () =>
    fi.enabled() && fi.state() === "analysis" && opts.hasInput() && !opts.isBusy()

  const handleFiDefault = async () => {
    if (!canSendFiDefault() || !opts.canSend() || !doSend) return
    const raw = opts.getText()
    const prefixed = withFiDefault(raw)
    opts.setText(prefixed)
    await doSend()
    fi.setState("default")
  }

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        !(e.ctrlKey || e.metaKey) ||
        e.key !== "Enter" ||
        e.shiftKey ||
        e.altKey ||
        !canSendFiDefault()
      )
        return
      e.preventDefault()
      e.stopPropagation()
      void handleFiDefault()
    }
    window.addEventListener("keydown", handler, true)
    onCleanup(() => window.removeEventListener("keydown", handler, true))
  })

  const setSend = (fn: () => Promise<void>) => {
    doSend = fn
  }

  return {
    enabled: fi.enabled,
    setEnabled: fi.setEnabled,
    state: fi.state,
    setState: fi.setState,
    setSend,
    Toolbar: () => (
      <FiWorkflowControls
        enabled={fi.enabled}
        state={fi.state}
        disabled={opts.isBusy}
        onEnabledChange={fi.setEnabled}
      />
    ),
    SendButton: () => (
      <Show when={canSendFiDefault()}>
        <Tooltip value="默认实施发送 (Ctrl+Enter)" placement="top">
          <Button variant="ghost" size="small" onClick={handleFiDefault} aria-label="默认实施发送">
            <Icon name="arrow-undo-down" size="small" />
          </Button>
        </Tooltip>
      </Show>
    ),
  }
}
