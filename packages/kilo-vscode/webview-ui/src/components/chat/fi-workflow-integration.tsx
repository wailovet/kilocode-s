import { Accessor, onCleanup, onMount } from "solid-js"
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
    if (!fi.enabled() || !opts.canSend() || !doSend) return
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
        !fi.enabled()
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

  const wrapSend = (fn: () => Promise<void>) => {
    return async () => {
      await fn()
      if (fi.enabled() && fi.state() === "default") {
        fi.setState("analysis")
      }
    }
  }

  return {
    enabled: fi.enabled,
    setEnabled: fi.setEnabled,
    state: fi.state,
    setState: fi.setState,
    setSend,
    wrapSend,
    Toolbar: () => (
      <FiWorkflowControls
        enabled={fi.enabled}
        state={fi.state}
        disabled={opts.isBusy}
        onEnabledChange={fi.setEnabled}
      />
    ),
    SendButton: () => null,
  }
}
