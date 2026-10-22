/**
 * Runs decorative work once the page has loaded and the browser is idle, at
 * most `timeout` ms later (v1.7.6): the first paint and the game's start stay
 * light. Safari has no `requestIdleCallback`: a short timeout stands in.
 */
export function whenIdle(task: () => void, timeout = 1500): void {
  const idle = (window as Partial<Pick<Window, 'requestIdleCallback'>>).requestIdleCallback;
  const run = () => {
    if (idle) idle.call(window, task, { timeout });
    else window.setTimeout(task, 200);
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}
