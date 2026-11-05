import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import type { MotionOptions, ScrollId, TransitionId } from '../../src/recipes/design-motion/model'

// Import only the exported primitives; never mount App, account state or cloud providers.
const [{ TransitionLayer, TransitionStage }, { ScrollScene }] = await Promise.all([
  import('../../src/recipes/design-motion/TransitionStage'),
  import('../../src/recipes/design-motion/ScrollScene'),
])
const element = document.getElementById('root')
if (!element) throw new Error('Missing isolated fixture root')
const root = createRoot(element)
let revision = 0

interface Props {
  options?: MotionOptions
  variant?: TransitionId | ScrollId
  phase?: 'enter' | 'leave'
  reduced?: boolean
}
declare global {
  interface Window {
    designPrimitivesHarness: {
      render: (mode: 'stage' | 'layer' | 'scroll' | 'empty', props?: Props) => number
    }
  }
}

window.designPrimitivesHarness = {
  render(mode, props = {}) {
    const options = props.options ?? { duration: 160, distance: 60, stagger: 35, color: '#c9a569' }
    const content = mode === 'stage'
      ? <TransitionStage variant={(props.variant ?? 'rise') as TransitionId} options={options} reduced={props.reduced} />
      : mode === 'layer'
        ? <TransitionLayer preset={(props.variant ?? 'rise') as TransitionId} phase={props.phase ?? 'enter'} duration={options.duration} distance={options.distance} reduced={props.reduced}>
            <button type="button" id="layer-button">Layer action</button>
          </TransitionLayer>
        : mode === 'scroll'
          ? <ScrollScene variant={(props.variant ?? 'reveal') as ScrollId} options={options} reduced={props.reduced} />
          : <p>Unmounted</p>
    revision += 1
    root.render(<StrictMode><section data-fixture-revision={revision}>{content}</section></StrictMode>)
    return revision
  },
}
window.designPrimitivesHarness.render('empty')
